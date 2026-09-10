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

                // Headers: Customer ID, SKU, Quantity, Rate, Comment, Location, Internal Memo, PO Number
                var orderData = [];
                var customerId = '';
                var headerInternalMemo = '';
                var headerPoNumber = '';

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
                        var intMemo = parts.length > 6 ? parts[6] : '';
                        var poNum = parts.length > 7 ? parts[7] : '';

                        if (lineCustId) {
                            customerId = lineCustId; // Take customer ID from the first valid line
                        }
                        
                        if (!headerInternalMemo && intMemo) headerInternalMemo = intMemo;
                        if (!headerPoNumber && poNum) headerPoNumber = poNum;

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

                // FUTURE CONFIGURATION: Map Portal Location Names to NetSuite Internal IDs
                // To activate dynamic locations down the road, you can use: LOCATION_MAP[itemRow.locationName] || DEFAULT_LOCATION_ID
                var LOCATION_MAP = {
                    'Zaks - Main Warehouse YYC': 1,
                    'Zaks - Edmonton Warehouse': 2,
                    'Lion - Warehouse YYC': 3,
                    'Lion USA - Gunship 3PL Utah': 5,
                    'Lion USA - Broadrange Logistics': 8,
                    'Lion - Defective Warehouse YYC': 10,
                    'Lion USA - Defective Warehouse Broadrange Logistics': 11,
                    'Zaks - Defective Main Warehouse': 12,
                    'Zaks - Defective Edmonton Warehouse': 14,
                    'Lion USA - Defective Warehouse Ferndale WA': 15,
                    'Lion Imports USA Inc.': 18,
                    'Lion USA - Walgreen Warehouse': 19,
                    'Lion - Warehouse YYC : Zaks Foods ULC': 20,
                    'Zaks - Main Warehouse YYC : Zaks Foods ULC': 22
                };

                // Currently hardcoded to 1 for initial launch.
                var DEFAULT_LOCATION_ID = 1;

                // Set Customer and Header Location
                soRec.setValue({ fieldId: 'entity', value: customerId });
                soRec.setValue({ fieldId: 'location', value: DEFAULT_LOCATION_ID });
                
                if (headerPoNumber) {
                    soRec.setValue({ fieldId: 'otherrefnum', value: headerPoNumber });
                }
                
                if (headerInternalMemo) {
                    // Note: If "INTERNAL MEMO" in NetSuite is a custom field rather than the standard Memo, 
                    // you may need to change 'memo' below to the custom field ID (e.g. 'custbody_internal_memo')
                    soRec.setValue({ fieldId: 'memo', value: headerInternalMemo });
                }
                
                // Cache for lookups to avoid exceeding governance limits on large orders
                var itemCache = {};

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

                    // Select new line
                    soRec.selectNewLine({ sublistId: 'item' });
                    soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemInternalId });
                    soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: itemRow.quantity });

                    // Only set rate if the rep manually overrode it in the portal. 
                    // Otherwise, leave it blank to let NetSuite apply the customer's Price Level.
                    if (itemRow.rate && itemRow.rate.trim() !== '') {
                        soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: parseFloat(itemRow.rate) });
                    }

                    // Hardcode Line Location to default
                    soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: DEFAULT_LOCATION_ID });

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
