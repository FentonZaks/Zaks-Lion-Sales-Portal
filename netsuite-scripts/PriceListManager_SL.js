/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * 
 * Description: Extracts all active Items and their CAD Price Levels to a CSV, 
 * and allows uploading a CSV to bulk update item pricing.
 */

define(['N/ui/serverWidget', 'N/record', 'N/file', 'N/log', 'N/search', 'N/task', 'N/url'], 
function(serverWidget, record, file, log, search, task, url) {

    // Common Price Levels for mapping
    var PRICE_LEVELS = [
        { id: 1, name: 'Retail' },
        { id: 2, name: 'Store' },
        { id: 3, name: 'Distributor' },
        { id: 4, name: 'MasterDist' },
        { id: 5, name: 'Online Price' },
        { id: 8, name: 'CTire' },
        { id: 9, name: 'PAFineFoods' },
        { id: 10, name: 'OtherDist' },
        { id: 11, name: 'FITC' },
        { id: 14, name: 'Wholesale' },
        { id: 18, name: 'Canco Price' }
    ];
    var CURRENCY_CAD = 1; // Assuming 1 is CAD. Adjust if needed.

    function onRequest(context) {
        if (context.request.method === 'GET') {
            var action = context.request.parameters.action;

            if (action === 'download') {
                return generateCsvResponse(context.response);
            }

            var form = serverWidget.createForm({
                title: 'Sales Portal: CAD Price List Manager'
            });

            // Help Text
            var helpField = form.addField({
                id: 'custpage_help',
                type: serverWidget.FieldType.INLINEHTML,
                label: ' '
            });

            var scriptId = context.request.parameters.script;
            var deployId = context.request.parameters.deploy;
            var downloadUrl = '';
            if (scriptId && deployId) {
                downloadUrl = url.resolveScript({
                    scriptId: scriptId,
                    deploymentId: deployId,
                    params: { action: 'download' }
                });
            }

            helpField.defaultValue = '<div style="font-size:14px; margin-bottom: 20px;">' +
                '<b>Download Prices:</b><br/>' +
                '<a href="' + downloadUrl + '" style="padding: 6px 16px; background-color: #005587; color: white; text-decoration: none; border-radius: 3px; display: inline-block; margin-top: 8px; margin-bottom: 20px; font-weight: bold;">⬇ Download Current CAD Prices (CSV)</a><br/><br/>' +
                '<b>Upload Prices:</b> Upload a modified CSV. The system will match by SKU and update the NetSuite pricing for the columns provided.' +
                '</div>';

            form.addField({
                id: 'custpage_csv_file',
                type: serverWidget.FieldType.FILE,
                label: 'Upload Updated Prices (CSV)'
            });

            form.addSubmitButton({
                label: 'Import Price Updates'
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
                    throw new Error("CSV is empty or invalid.");
                }

                // Parse Headers
                var headers = lines[0].split(',').map(function(h) { return h.replace(/^"|"$/g, '').trim(); });
                var skuIdx = headers.indexOf('SKU');
                if (skuIdx === -1) throw new Error("CSV must contain a 'SKU' column.");

                // Map header names to Price Level IDs
                var headerToPriceLevelMap = {};
                for (var i = 0; i < headers.length; i++) {
                    var plMatch = PRICE_LEVELS.filter(function(pl) { return pl.name.toLowerCase() === headers[i].toLowerCase(); });
                    if (plMatch.length > 0) {
                        headerToPriceLevelMap[i] = plMatch[0].id;
                    }
                }

                var updates = 0;

                // Process lines
                // Note: For very large files, a Map/Reduce script is safer to avoid Governance limits.
                // Using Suitelet here assuming catalog is reasonable (< 5000 lines).
                for (var r = 1; r < lines.length; r++) {
                    var line = lines[r].trim();
                    if (!line) continue;

                    var parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
                    for(var j=0; j<parts.length; j++) {
                        parts[j] = parts[j].replace(/^"|"$/g, '').trim();
                    }

                    var sku = parts[skuIdx];
                    if (!sku) continue;

                    // Find internal ID for the SKU
                    var itemId = findItemBySku(sku);
                    if (!itemId) {
                        log.error('Item Not Found', sku);
                        continue;
                    }

                    try {
                        var itemRec = record.load({ type: record.Type.INVENTORY_ITEM, id: itemId, isDynamic: true });
                        var priceChanged = false;

                        // Find the pricing sublist for CAD (Currency = 1)
                        // In Multi-Currency environments, there is a sublist named 'price1' for currency 1, 'price2' for currency 2, etc.
                        // We will iterate over the standard price sublist.
                        var currencySublistId = 'price' + CURRENCY_CAD; 
                        
                        // NetSuite UI exposes "price1" etc. as sublists.
                        // Note: If single currency, it's just 'price'
                        var sublistToUse = itemRec.getSublist({ sublistId: currencySublistId }) ? currencySublistId : 'price';

                        var lineCount = itemRec.getLineCount({ sublistId: sublistToUse });

                        for (var colIdx in headerToPriceLevelMap) {
                            var priceLevelId = headerToPriceLevelMap[colIdx];
                            var newPriceStr = parts[colIdx];
                            
                            if (newPriceStr === undefined || newPriceStr === null) continue;
                            var newPrice = parseFloat(newPriceStr);
                            if (isNaN(newPrice)) continue; // skip blank/invalid cells

                            // Find the line for this price level
                            var lineFound = false;
                            for (var li = 0; li < lineCount; li++) {
                                itemRec.selectLine({ sublistId: sublistToUse, line: li });
                                var pl = itemRec.getCurrentSublistValue({ sublistId: sublistToUse, fieldId: 'pricelevel' });
                                if (pl == priceLevelId) {
                                    lineFound = true;
                                    var currentPrice = itemRec.getCurrentSublistValue({ sublistId: sublistToUse, fieldId: 'price_1_' });
                                    if (currentPrice != newPrice) {
                                        itemRec.setCurrentSublistValue({ sublistId: sublistToUse, fieldId: 'price_1_', value: newPrice });
                                        itemRec.commitLine({ sublistId: sublistToUse });
                                        priceChanged = true;
                                    }
                                    break;
                                }
                            }
                            // Note: If price level doesn't exist on the item record, 
                            // we would ideally add it, but 'price' sublists are typically pre-populated with all levels.
                        }

                        if (priceChanged) {
                            itemRec.save();
                            updates++;
                        }
                    } catch (itemErr) {
                        log.error('Error updating item ' + sku, itemErr);
                    }
                }

                context.response.write('<h2>Success</h2><p>Processed successfully. Updated ' + updates + ' items.</p><br/><a href="javascript:history.back()">Go Back</a>');

            } catch (e) {
                log.error('Error Processing CSV', e);
                context.response.write('<h2>Error Processing CSV</h2><p>' + e.message + '</p><br/><a href="javascript:history.back()">Go Back</a>');
            }
        }
    }

    function generateCsvResponse(response) {
        var csvHeaders = ['SKU'];
        PRICE_LEVELS.forEach(function(pl) { csvHeaders.push(pl.name); });
        
        var csvRows = [];
        var skuDataMap = {}; // { 'ITEM1': { 1: 10.50, 2: 12.00 } }

        // Note: SuiteScript search on 'pricing' is sometimes limited.
        // A robust way to extract all prices is searching item, and retrieving the 'pricing' join.
        var itemSearch = search.create({
            type: search.Type.ITEM,
            filters: [
                ['isinactive', 'is', 'F'],
                'AND',
                ['pricing.currency', 'anyof', CURRENCY_CAD]
            ],
            columns: [
                search.createColumn({ name: 'itemid' }),
                search.createColumn({ name: 'pricelevel', join: 'pricing' }),
                search.createColumn({ name: 'unitprice', join: 'pricing' })
            ]
        });

        // Run search (Handling > 1000 results using paged data)
        var pagedData = itemSearch.runPaged({ pageSize: 1000 });
        pagedData.pageRanges.forEach(function(pageRange) {
            var page = pagedData.fetch({ index: pageRange.index });
            page.data.forEach(function(result) {
                var sku = result.getValue({ name: 'itemid' });
                var pl = result.getValue({ name: 'pricelevel', join: 'pricing' });
                var price = result.getValue({ name: 'unitprice', join: 'pricing' });

                if (!skuDataMap[sku]) skuDataMap[sku] = {};
                skuDataMap[sku][pl] = price;
            });
        });

        // Build CSV string
        Object.keys(skuDataMap).forEach(function(sku) {
            var row = ['"' + sku.replace(/"/g, '""') + '"'];
            PRICE_LEVELS.forEach(function(pl) {
                var price = skuDataMap[sku][pl.id] || '';
                row.push(price);
            });
            csvRows.push(row.join(','));
        });

        var csvString = csvHeaders.join(',') + '\n' + csvRows.join('\n');

        response.setHeader({ name: 'Content-Type', value: 'text/csv' });
        response.setHeader({ name: 'Content-Disposition', value: 'attachment; filename="CAD_PriceList_Export.csv"' });
        response.write(csvString);
    }

    function findItemBySku(sku) {
        var itemSearch = search.create({
            type: search.Type.ITEM,
            filters: [['itemid', 'is', sku]],
            columns: ['internalid']
        });
        var resultSet = itemSearch.run().getRange({ start: 0, end: 1 });
        if (resultSet && resultSet.length > 0) {
            return resultSet[0].getValue({ name: 'internalid' });
        }
        return null;
    }

    return {
        onRequest: onRequest
    };
});
