/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * 
 * Description: Parses the Sales Portal Draft Order CSV and creates a Sales Order in NetSuite.
 * It honors the NetSuite price levels by intentionally leaving the line rate blank unless explicitly overridden.
 */

define(['N/ui/serverWidget', 'N/record', 'N/file', 'N/log', 'N/search', 'N/redirect'], 
function(serverWidget, record, file, log, search, redirect) {

    function onRequest(context) {
        if (context.request.method === 'GET') {
            var form = serverWidget.createForm({
                title: 'Sales Portal: Import Draft Order'
            });

            form.addField({
                id: 'custpage_csv_file',
                type: serverWidget.FieldType.FILE,
                label: 'Upload Order CSV File'
            });

            form.addSubmitButton({
                label: 'Create Sales Order'
            });

            context.response.writePage(form);
            return;
        }

        if (context.request.method === 'POST') {
            try {
                var fileObj = context.request.files.custpage_csv_file;
                if (!fileObj) {
                    throw new Error("No file uploaded.");
                }

                var fileContent = fileObj.getContents();
                var lines = fileContent.split('\n');
                if (lines.length < 2) {
                    throw new Error("CSV file is empty or missing data.");
                }

                // Headers: Customer ID, SKU, Quantity, Rate, Comment, Location
                var orderData = [];
                var customerId = '';

                for (var i = 1; i < lines.length; i++) {
                    var line = lines[i].trim();
                    if (!line) continue;

                    // Parse CSV safely handling quotes
                    var parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
                    for(var j=0; j<parts.length; j++) {
                        parts[j] = parts[j].replace(/^"|"$/g, '').trim();
                    }

                    if (parts.length >= 3) {
                        var lineCustId = parts[0];
                        var sku = parts[1];
                        var qty = parts[2];
                        var rate = parts.length > 3 ? parts[3] : '';
                        var comment = parts.length > 4 ? parts[4] : '';
                        var locationName = parts.length > 5 ? parts[5] : '';

                        if (lineCustId) {
                            customerId = lineCustId; // Take customer ID from the first valid line
                        }

                        orderData.push({
                            sku: sku,
                            quantity: qty,
                            rate: rate,
                            comment: comment,
                            locationName: locationName
                        });
                    }
                }

                if (!customerId) {
                    throw new Error("Could not determine Customer ID from CSV.");
                }

                log.debug('Parsed Order Data', orderData);

                // Create Sales Order Record
                var soRec = record.create({
                    type: record.Type.SALES_ORDER,
                    isDynamic: true
                });

                // Set Customer (Assuming the portal NetSuite ID is the Internal ID in NetSuite)
                soRec.setValue({ fieldId: 'entity', value: customerId });
                
                // Cache for lookups to avoid exceeding governance limits on large orders
                var itemCache = {};
                var locationCache = {};

                // Add Items
                for (var k = 0; k < orderData.length; k++) {
                    var itemRow = orderData[k];
                    
                    // 1. Lookup Item Internal ID by SKU (Name)
                    var itemInternalId = itemCache[itemRow.sku];
                    if (!itemInternalId) {
                        var itemSearch = search.create({
                            type: search.Type.ITEM,
                            filters: [['itemid', 'is', itemRow.sku]],
                            columns: ['internalid']
                        });
                        var resultSet = itemSearch.run().getRange({ start: 0, end: 1 });
                        if (resultSet && resultSet.length > 0) {
                            itemInternalId = resultSet[0].getValue({ name: 'internalid' });
                            itemCache[itemRow.sku] = itemInternalId;
                        } else {
                            throw new Error("Could not find Item in NetSuite with SKU: " + itemRow.sku);
                        }
                    }

                    // 2. Lookup Location Internal ID by Name
                    var locationInternalId = '';
                    if (itemRow.locationName) {
                        locationInternalId = locationCache[itemRow.locationName];
                        if (!locationInternalId) {
                            var locSearch = search.create({
                                type: search.Type.LOCATION,
                                filters: [['name', 'is', itemRow.locationName]],
                                columns: ['internalid']
                            });
                            var locSet = locSearch.run().getRange({ start: 0, end: 1 });
                            if (locSet && locSet.length > 0) {
                                locationInternalId = locSet[0].getValue({ name: 'internalid' });
                                locationCache[itemRow.locationName] = locationInternalId;
                            }
                        }
                    }

                    // Fallback to ANY active location if location is mandatory and we didn't find one
                    if (!locationInternalId) {
                        if (!locationCache['DEFAULT_FALLBACK']) {
                            var fallbackSearch = search.create({
                                type: search.Type.LOCATION,
                                filters: [['isinactive', 'is', 'F']],
                                columns: ['internalid']
                            });
                            var fallbackSet = fallbackSearch.run().getRange({ start: 0, end: 1 });
                            if (fallbackSet && fallbackSet.length > 0) {
                                locationCache['DEFAULT_FALLBACK'] = fallbackSet[0].getValue({ name: 'internalid' });
                            }
                        }
                        locationInternalId = locationCache['DEFAULT_FALLBACK'];
                    }

                    // Select new line
                    soRec.selectNewLine({ sublistId: 'item' });
                    soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemInternalId });
                    soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: itemRow.quantity });

                    // Only set rate if the rep manually overrode it in the portal. 
                    // Otherwise, leave it blank to let NetSuite apply the customer's Price Level.
                    if (itemRow.rate && itemRow.rate.trim() !== '') {
                        soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: parseFloat(itemRow.rate) });
                    }

                    if (locationInternalId) {
                        soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: locationInternalId });
                    }

                    if (itemRow.comment) {
                        soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'description', value: 'Portal Note: ' + itemRow.comment });
                    }

                    soRec.commitLine({ sublistId: 'item' });
                }

                // Save Sales Order
                var salesOrderId = soRec.save();
                log.audit('Sales Order Created', 'ID: ' + salesOrderId);

                // Success Response
                context.response.write('<h2>Success!</h2><p>Sales Order successfully created. <a href="/app/accounting/transactions/salesord.nl?id=' + salesOrderId + '">Click here to view Sales Order</a></p><br/><a href="javascript:history.back()">Upload Another</a>');

            } catch (e) {
                log.error('Error Processing CSV', e);
                context.response.write('<h2>Error Processing CSV</h2><p>' + e.message + '</p><br/><a href="javascript:history.back()">Go Back</a>');
            }
        }
    }

    return {
        onRequest: onRequest
    };
});
