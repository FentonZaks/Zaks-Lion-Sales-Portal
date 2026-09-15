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
            var form = serverWidget.createForm({ title: 'Upload Draft Sales Order CSV' });
            
            var fileField = form.addField({
                id: 'custpage_csvfile',
                type: serverWidget.FieldType.FILE,
                label: 'Select CSV File'
            });
            fileField.isMandatory = true;
            
            form.addSubmitButton({ label: 'Upload & Create Sales Order' });
            
            context.response.writePage(form);
        } else {
            try {
                var csvFile = context.request.files.custpage_csvfile || context.request.files.csvfile;
                if (!csvFile) {
                    var form = serverWidget.createForm({ title: 'Error' });
                    form.addField({ id: 'custpage_err', type: serverWidget.FieldType.INLINEHTML, label: ' ' }).defaultValue = '<p>No file uploaded.</p><br/><a href="javascript:history.back()">Go Back</a>';
                    context.response.writePage(form);
                    return;
                }

                var fileContent = csvFile.getContents();
                var lines = fileContent.split(/\r?\n/);

                if (lines.length < 2) {
                    var form = serverWidget.createForm({ title: 'Error' });
                    form.addField({ id: 'custpage_err', type: serverWidget.FieldType.INLINEHTML, label: ' ' }).defaultValue = '<p>CSV is empty or missing data rows.</p><br/><a href="javascript:history.back()">Go Back</a>';
                    context.response.writePage(form);
                    return;
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
                var needsPricingReview = false;
                var missingItems = false;
                var missingItemText = '';
                
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
                            // Item not found in NetSuite. Skip it and flag the order.
                            missingItems = true;
                            missingItemText += itemRow.sku + ' ';
                            continue;
                        }
                    }

                    // Select new line
                    soRec.selectNewLine({ sublistId: 'item' });
                    soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemInternalId });
                    soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: itemRow.quantity });

                    // Only set rate if the rep manually overrode it in the portal. 
                    // Otherwise, leave it blank to let NetSuite apply the customer's Price Level.
                    if (itemRow.rate && itemRow.rate.trim() !== '') {
                        // Crucial: Set price level to Custom (-1) before setting the custom rate
                        soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: -1 });
                        soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: parseFloat(itemRow.rate) });
                    }

                    // Hardcode Line Location to default
                    soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: DEFAULT_LOCATION_ID });

                    if (itemRow.comment) {
                        soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'description', value: 'Portal Note: ' + itemRow.comment });
                    }

                    try {
                        soRec.commitLine({ sublistId: 'item' });
                    } catch (lineErr) {
                        var errMsg = lineErr.message || lineErr.toString();
                        if (errMsg.indexOf('Amount') !== -1) {
                            // NetSuite threw an error because the item has no price for this customer's price level.
                            // The user requested we force it through with a 0 price and flag it for admin review.
                            needsPricingReview = true;
                            
                            soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: -1 }); // Custom Price Level
                            soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 0 });
                            
                            var currentDesc = soRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'description' }) || '';
                            soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'description', value: '[!!! MISSING PRICE !!!] ' + currentDesc });
                            
                            soRec.commitLine({ sublistId: 'item' });
                        } else {
                            throw lineErr;
                        }
                    }
                }

                // Add warning memos to the main Sales Order if there were any issues
                var currentMemo = soRec.getValue({ fieldId: 'memo' }) || '';
                var newMemo = currentMemo;
                
                if (needsPricingReview) {
                    newMemo = '[ATTENTION: ITEMS NEED PRICING] ' + newMemo;
                }
                if (missingItems) {
                    newMemo = '[WARNING: SKIPPED MISSING SKUs: ' + missingItemText.trim() + '] ' + newMemo;
                }
                
                if (newMemo !== currentMemo) {
                    soRec.setValue({ fieldId: 'memo', value: newMemo });
                }

                // Save Sales Order
                var salesOrderId = soRec.save();
                log.audit('Sales Order Created', 'ID: ' + salesOrderId);

                var form = serverWidget.createForm({ title: 'Success!' });
                form.addField({ id: 'custpage_msg', type: serverWidget.FieldType.INLINEHTML, label: ' ' }).defaultValue = 
                    '<p>Sales Order successfully created. <a href="/app/accounting/transactions/salesord.nl?id=' + salesOrderId + '">Click here to view Sales Order</a></p><br/><a href="javascript:history.back()">Upload Another</a>';
                context.response.writePage(form);

            } catch (e) {
                log.error('Error Processing CSV', e);
                var form = serverWidget.createForm({ title: 'Error Processing CSV' });
                form.addField({ id: 'custpage_err', type: serverWidget.FieldType.INLINEHTML, label: ' ' }).defaultValue = 
                    '<p>' + e.message + '</p><br/><a href="javascript:history.back()">Go Back</a>';
                context.response.writePage(form);
            }
        }
    }

    return {
        onRequest: onRequest
    };
});
