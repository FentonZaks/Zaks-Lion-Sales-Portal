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
    var CURRENCY_CAD = 1; // Assuming 1 is CAD
    var CURRENCY_USD = 2; // Assuming 2 is USD

    function onRequest(context) {
        if (context.request.method === 'GET') {
            var action = context.request.parameters.action;

            if (action === 'download_cad') {
                return generateCsvResponse(context.response, CURRENCY_CAD);
            }
            if (action === 'download_usd') {
                return generateCsvResponse(context.response, CURRENCY_USD);
            }

            var form = serverWidget.createForm({
                title: 'Sales Portal: Price List Manager'
            });

            // Help Text
            var helpField = form.addField({
                id: 'custpage_help',
                type: serverWidget.FieldType.INLINEHTML,
                label: ' '
            });

            var scriptId = context.request.parameters.script;
            var deployId = context.request.parameters.deploy;
            var downloadCadUrl = '';
            var downloadUsdUrl = '';
            if (scriptId && deployId) {
                downloadCadUrl = url.resolveScript({ scriptId: scriptId, deploymentId: deployId, params: { action: 'download_cad' } });
                downloadUsdUrl = url.resolveScript({ scriptId: scriptId, deploymentId: deployId, params: { action: 'download_usd' } });
            }

            helpField.defaultValue = '<div style="font-size:14px; margin-bottom: 20px;">' +
                '<b>Download Prices:</b><br/>' +
                '<a href="' + downloadCadUrl + '" style="padding: 6px 16px; background-color: #005587; color: white; text-decoration: none; border-radius: 3px; display: inline-block; margin-top: 8px; margin-bottom: 8px; font-weight: bold;">\u2B07 Download CAD Prices (CSV)</a><br/>' +
                '<a href="' + downloadUsdUrl + '" style="padding: 6px 16px; background-color: #2e7d32; color: white; text-decoration: none; border-radius: 3px; display: inline-block; margin-bottom: 20px; font-weight: bold;">\u2B07 Download USD Prices (CSV)</a><br/><br/>' +
                '<b>Upload Prices:</b> Select the currency below, then upload a modified CSV.' +
                '</div>';

            var currencyField = form.addField({
                id: 'custpage_currency',
                type: serverWidget.FieldType.SELECT,
                label: 'Currency to Update'
            });
            currencyField.addSelectOption({ value: '1', text: 'CAD' });
            currencyField.addSelectOption({ value: '2', text: 'USD' });
            currencyField.isMandatory = true;

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
        } else {
            // POST block
            try {
                var fileObj = context.request.files.custpage_csv_file;
                var selectedCurrency = parseInt(context.request.parameters.custpage_currency) || CURRENCY_CAD;
                
                if (!fileObj) {
                    throw new Error("No file uploaded.");
                }

                var fileContent = fileObj.getContents();
                var lines = fileContent.split('\n');
                if (lines.length < 2) {
                    throw new Error("CSV is empty or invalid.");
                }

                // Parse Headers
                var headers = lines[0].replace(/\uFEFF/g, '').split(',').map(function(h) { return h.replace(/^"|"$/g, '').trim(); });
                var idIdx = headers.indexOf('Internal ID');
                var typeIdx = headers.indexOf('Record Type');
                var skuIdx = headers.indexOf('SKU');
                
                if (idIdx === -1 || typeIdx === -1) {
                    throw new Error("CSV must contain 'Internal ID' and 'Record Type' columns for fast processing. Please download a new CSV.");
                }

                // Map header names to Price Level IDs
                var headerToPriceLevelMap = {};
                for (var i = 0; i < headers.length; i++) {
                    var plMatch = PRICE_LEVELS.filter(function(pl) { return pl.name.toLowerCase() === headers[i].toLowerCase(); });
                    if (plMatch.length > 0) {
                        headerToPriceLevelMap[i] = plMatch[0].id;
                    }
                }

                var updates = 0;
                var skipped = 0;
                var errors = [];

                // Process lines
                // Note: For very large files, a Map/Reduce script is safer to avoid Governance limits.
                // Using Suitelet here assuming catalog is reasonable (< 5000 lines).
                for (var r = 1; r < lines.length; r++) {
                    var line = lines[r].trim();
                    if (!line) continue;

                    // Safely split CSV line by comma, ignoring commas inside quotes
                    var parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                    for(var j = 0; j < parts.length; j++) {
                        parts[j] = parts[j] ? parts[j].replace(/^"|"$/g, '').trim() : '';
                    }

                    var internalId = parts[idIdx];
                    var recType = parts[typeIdx];
                    var sku = skuIdx !== -1 ? parts[skuIdx] : 'ID:' + internalId;

                    if (!internalId || !recType) continue;

                    try {
                        var itemRec = record.load({ type: recType, id: internalId, isDynamic: true });
                        var priceChanged = false;

                        var currencySublistId = 'price' + selectedCurrency; 
                        var sublistToUse = 'price';
                        var sublistNames = itemRec.getSublists();
                        if (sublistNames.indexOf(currencySublistId) !== -1) {
                            sublistToUse = currencySublistId;
                        } else if (sublistNames.indexOf('price') !== -1) {
                            sublistToUse = 'price';
                        } else {
                            errors.push(sku + ': Item has no pricing sublist configured.');
                            continue; // No pricing sublist found
                        }

                        var lineCount = itemRec.getLineCount({ sublistId: sublistToUse });

                        for (var colIdx in headerToPriceLevelMap) {
                            var priceLevelId = headerToPriceLevelMap[colIdx];
                            var newPriceStr = parts[colIdx];
                            
                            if (newPriceStr === undefined || newPriceStr === null) continue;
                            
                            // Treat empty string as an intentional blank to clear the price
                            var newPrice = newPriceStr === '' ? '' : parseFloat(newPriceStr);
                            if (newPrice !== '' && isNaN(newPrice)) continue; // skip invalid text, but allow ''

                            // Find the line for this price level
                            var lineFound = false;
                            for (var li = 0; li < lineCount; li++) {
                                itemRec.selectLine({ sublistId: sublistToUse, line: li });
                                var pl = itemRec.getCurrentSublistValue({ sublistId: sublistToUse, fieldId: 'pricelevel' });
                                if (pl == priceLevelId) {
                                    lineFound = true;
                                    var currentPrice = itemRec.getCurrentSublistValue({ sublistId: sublistToUse, fieldId: 'price_1_' });
                                    
                                    // Normalize NetSuite's current value to strictly compare 0 vs ''
                                    var normalizedCurrent = (currentPrice === null || currentPrice === '') ? '' : parseFloat(currentPrice);

                                    if (normalizedCurrent !== newPrice) {
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
                        } else {
                            skipped++; // Prices were identical
                        }
                    } catch (itemErr) {
                        log.error('Error updating item ' + sku, itemErr);
                        errors.push(sku + ': ' + (itemErr.message || itemErr.toString()));
                    }
                }

                var msg = '<h2>Import Complete</h2><p>Successfully updated <b>' + updates + '</b> items.</p>';
                if (skipped > 0) {
                    msg += '<p>Skipped <b>' + skipped + '</b> items (the uploaded prices were identical to NetSuite).</p>';
                }
                if (errors.length > 0) {
                    msg += '<p style="color:red;">Errors occurred on ' + errors.length + ' items. First few errors:</p><ul>';
                    for (var e = 0; e < Math.min(10, errors.length); e++) {
                        msg += '<li>' + errors[e] + '</li>';
                    }
                    msg += '</ul>';
                }
                msg += '<br/><a href="javascript:history.back()">Go Back</a>';
                context.response.write(msg);

            } catch (e) {
                log.error('Error Processing CSV', e);
                context.response.write('<h2>Error Processing CSV</h2><p>' + e.message + '</p><br/><a href="javascript:history.back()">Go Back</a>');
            }
        }
    }

    function generateCsvResponse(response, currencyId) {
        var currencyName = currencyId === CURRENCY_USD ? 'USD' : 'CAD';
        var csvHeaders = ['Internal ID', 'Record Type', 'SKU', 'Description'];
        PRICE_LEVELS.forEach(function(pl) { csvHeaders.push(pl.name); });
        
        var csvRows = [];
        var skuDataMap = {}; // { 'ITEM1': { internalId: 1, recordType: 'x', description: 'Desc', 1: 10.50 } }

        // Note: SuiteScript search on 'pricing' is sometimes limited.
        // A robust way to extract all prices is searching item, and retrieving the 'pricing' join.
        var itemSearch = search.create({
            type: search.Type.ITEM,
            filters: [
                ['isinactive', 'is', 'F'],
                'AND',
                ['pricing.currency', 'anyof', currencyId]
            ],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: 'type' }),
                search.createColumn({ name: 'itemid' }),
                search.createColumn({ name: 'displayname' }),
                search.createColumn({ name: 'salesdescription' }),
                search.createColumn({ name: 'pricelevel', join: 'pricing' }),
                search.createColumn({ name: 'unitprice', join: 'pricing' })
            ]
        });

        // Run search (Handling > 1000 results using paged data)
        var pagedData = itemSearch.runPaged({ pageSize: 1000 });
        pagedData.pageRanges.forEach(function(pageRange) {
            var page = pagedData.fetch({ index: pageRange.index });
            page.data.forEach(function(result) {
                var internalId = result.getValue({ name: 'internalid' });
                var rawType = result.getValue({ name: 'type' });
                var recType = record.Type.INVENTORY_ITEM; // default
                if (rawType) {
                    var t = rawType.toLowerCase();
                    if (t === 'invtpart') recType = record.Type.INVENTORY_ITEM;
                    else if (t === 'noninvtpart') recType = record.Type.NON_INVENTORY_ITEM;
                    else if (t === 'assembly') recType = record.Type.ASSEMBLY_ITEM;
                    else if (t === 'kit') recType = record.Type.KIT_ITEM;
                    else if (t === 'service') recType = record.Type.SERVICE_ITEM;
                }

                var sku = result.getValue({ name: 'itemid' });
                var desc = result.getValue({ name: 'salesdescription' }) || result.getValue({ name: 'displayname' }) || '';
                var pl = result.getValue({ name: 'pricelevel', join: 'pricing' });
                var price = result.getValue({ name: 'unitprice', join: 'pricing' });

                if (!skuDataMap[sku]) skuDataMap[sku] = { internalId: internalId, recordType: recType, description: desc };
                skuDataMap[sku][pl] = price;
            });
        });

        // Build CSV string
        Object.keys(skuDataMap).forEach(function(sku) {
            var row = [
                '"' + skuDataMap[sku].internalId + '"',
                '"' + skuDataMap[sku].recordType + '"',
                '"' + sku.replace(/"/g, '""') + '"',
                '"' + skuDataMap[sku].description.replace(/"/g, '""') + '"'
            ];
            PRICE_LEVELS.forEach(function(pl) {
                var price = skuDataMap[sku][pl.id] || '';
                row.push(price);
            });
            csvRows.push(row.join(','));
        });

        var csvString = csvHeaders.join(',') + '\n' + csvRows.join('\n');

        response.setHeader({ name: 'Content-Type', value: 'text/csv' });
        response.setHeader({ name: 'Content-Disposition', value: 'attachment; filename="' + currencyName + '_PriceList_Export.csv"' });
        response.write(csvString);
    }

    return {
        onRequest: onRequest
    };
});
