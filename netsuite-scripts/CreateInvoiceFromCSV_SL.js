/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/file', 'N/record', 'N/search'], function(file, record, search) {

    function onRequest(context) {
        if (context.request.method === 'GET') {
            var html = '<html><body><h2>Upload Direct Invoice CSV</h2>' +
                       '<form method="POST" enctype="multipart/form-data">' +
                       '<input type="file" name="csvfile" accept=".csv" required/><br/><br/>' +
                       '<input type="submit" value="Upload & Create Invoice"/>' +
                       '</form></body></html>';
            context.response.write(html);
        } else {
            var csvFile = context.request.files.csvfile;
            if (!csvFile) {
                context.response.write('<h2>Error</h2><p>No file uploaded.</p>');
                return;
            }

            var fileContent = csvFile.getContents();
            var lines = fileContent.split(/\r?\n/);

            if (lines.length < 2) {
                context.response.write('<h2>Error</h2><p>CSV is empty or missing data rows.</p>');
                return;
            }

            var customerId = null;
            var headerInternalMemo = '';
            var headerPoNumber = '';
            var orderData = [];

            try {
                for (var i = 1; i < lines.length; i++) {
                    var line = lines[i].trim();
                    if (!line) continue;

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
                            customerId = lineCustId; 
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

                log.debug('Parsed Invoice Data', orderData);

                var invRec = record.create({
                    type: record.Type.INVOICE,
                    isDynamic: true
                });

                var DEFAULT_LOCATION_ID = 1;

                invRec.setValue({ fieldId: 'entity', value: customerId });
                invRec.setValue({ fieldId: 'location', value: DEFAULT_LOCATION_ID });
                
                if (headerPoNumber) {
                    invRec.setValue({ fieldId: 'otherrefnum', value: headerPoNumber });
                }
                
                if (headerInternalMemo) {
                    invRec.setValue({ fieldId: 'memo', value: headerInternalMemo });
                }
                
                var itemCache = {};
                var missingItems = false;
                var missingItemText = '';
                
                for (var k = 0; k < orderData.length; k++) {
                    var itemRow = orderData[k];
                    
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
                            missingItems = true;
                            missingItemText += itemRow.sku + ' ';
                            continue;
                        }
                    }

                    invRec.selectNewLine({ sublistId: 'item' });
                    invRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemInternalId });
                    invRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: itemRow.quantity });

                    if (itemRow.rate && itemRow.rate.trim() !== '') {
                        invRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: -1 });
                        invRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: parseFloat(itemRow.rate) });
                    }

                    invRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: DEFAULT_LOCATION_ID });

                    if (itemRow.comment) {
                        invRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'description', value: 'Portal Note: ' + itemRow.comment });
                    }

                    try {
                        invRec.commitLine({ sublistId: 'item' });
                    } catch (lineErr) {
                        var errMsg = lineErr.message || lineErr.toString();
                        if (errMsg.indexOf('Amount') !== -1) {
                            throw new Error("Failed to add Item '" + itemRow.sku + "' to the Invoice. NetSuite could not determine a price for this item based on the customer's Price Level. Please configure pricing in NetSuite before submitting a Direct Invoice.");
                        } else {
                            throw lineErr;
                        }
                    }
                }

                var currentMemo = invRec.getValue({ fieldId: 'memo' }) || '';
                var newMemo = currentMemo;
                
                if (missingItems) {
                    newMemo = '[WARNING: SKIPPED MISSING SKUs: ' + missingItemText.trim() + '] ' + newMemo;
                }
                
                if (newMemo !== currentMemo) {
                    invRec.setValue({ fieldId: 'memo', value: newMemo });
                }

                var invoiceId = invRec.save();
                log.audit('Invoice Created', 'ID: ' + invoiceId);

                context.response.write('<h2>Success!</h2><p>Invoice successfully created. <a href="/app/accounting/transactions/custinvc.nl?id=' + invoiceId + '">Click here to view Invoice</a></p><br/><a href="javascript:history.back()">Upload Another</a>');

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
