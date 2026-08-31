
/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 * 
 * DESCRIPTION:
 * Pushes Active Product data and multi-warehouse inventory from NetSuite Sandbox to the Supabase Sales Portal.
 */

define(['N/search', 'N/https', 'N/log', 'N/runtime'],
    function(search, https, log, runtime) {

        function execute(scriptContext) {
            try {
                // 1. Configure Supabase Credentials
                const SUPABASE_URL = 'https://gurkqbfgvpxtxhzgjriy.supabase.co';
                const SUPABASE_SERVICE_KEY = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'; 

                // 2. Base Search for Active and Inactive Items
                var itemSearch = search.create({
                    type: search.Type.ITEM,
                    filters: [
                        ['type', 'anyof', 'InvtPart', 'Assembly', 'Kit', 'Group'] // Inventory, Assembly, Kit, and Group items
                    ],
                    columns: [
                        'internalid',
                        'itemid', // SKU
                        'displayname',
                        'salesdescription',
                        'baseprice',
                        'class', // Category
                        'isinactive',
                        'custitemzaks_inner_case_count',
                        'custitemzaks_master_case_count',
                        'inventorylocation',
                        'locationquantityavailable'
                    ]
                });

                // We need to aggregate the results because each inventory location will output as a separate row for the same item.
                var productsMap = {};

                var pagedData = itemSearch.runPaged({ pageSize: 1000 });
                
                pagedData.pageRanges.forEach(function(pageRange) {
                    var page = pagedData.fetch({ index: pageRange.index });
                    
                    page.data.forEach(function(result) {
                        var internalId = result.getValue('internalid');
                        
                        if (!productsMap[internalId]) {
                            var classString = result.getText('class') || '';
                            var primaryCategory = classString;
                            var secondaryCategory = '';
                            
                            if (classString.indexOf(' : ') !== -1) {
                                var parts = classString.split(' : ');
                                primaryCategory = parts[0];
                                secondaryCategory = parts.slice(1).join(' : ');
                            }

                            productsMap[internalId] = {
                                net_suite_id: internalId,
                                sku: result.getValue('itemid') || '',
                                name: result.getValue('displayname') || result.getValue('itemid') || 'Unknown Item',
                                description: result.getValue('salesdescription') || '',
                                base_price: parseFloat(result.getValue('baseprice')) || 0,
                                primary_category: primaryCategory,
                                secondary_category: secondaryCategory,
                                is_active: result.getValue('isinactive') !== true && result.getValue('isinactive') !== 'T',
                                inner_carton_qty: parseInt(result.getValue('custitemzaks_inner_case_count')) || null,
                                master_case_qty: parseInt(result.getValue('custitemzaks_master_case_count')) || null,
                                estimated_inventory: 0,
                                inventory_by_location: {},
                                kit_components: []
                            };
                        }

                        // Aggregate Location Inventory
                        var locName = result.getText('inventorylocation');
                        var qtyStr = result.getValue('locationquantityavailable');
                        
                        if (locName && locName.toUpperCase().indexOf('DEFECTIVE') === -1 && qtyStr !== null && qtyStr !== '') {
                            var qty = parseInt(qtyStr) || 0;
                            productsMap[internalId].inventory_by_location[locName] = qty;
                            productsMap[internalId].estimated_inventory += qty;
                        }
                    });
                });

                // 3. Secondary Search to collect Component data for Kits & Groups
                var kitSearch = search.create({
                    type: search.Type.ITEM,
                    filters: [
                        ['type', 'anyof', 'Kit', 'Group']
                    ],
                    columns: [
                        'internalid',
                        search.createColumn({ name: 'itemid', join: 'memberitem' }), // Component SKU
                        search.createColumn({ name: 'memberquantity' }) // Component Quantity
                    ]
                });

                var kitPagedData = kitSearch.runPaged({ pageSize: 1000 });
                kitPagedData.pageRanges.forEach(function(pageRange) {
                    var page = kitPagedData.fetch({ index: pageRange.index });
                    
                    page.data.forEach(function(result) {
                        var kitId = result.getValue('internalid');
                        var compSku = result.getValue({ name: 'itemid', join: 'memberitem' });
                        var compQtyStr = result.getValue({ name: 'memberquantity' });

                        if (productsMap[kitId] && compSku) {
                            var compQty = parseFloat(compQtyStr) || 1;
                            
                            // Prevent duplicate entries if the search returns multiple rows (e.g. per location)
                            var existingComp = productsMap[kitId].kit_components.filter(function(c) {
                                return c.sku === compSku;
                            });

                            if (existingComp.length === 0) {
                                productsMap[kitId].kit_components.push({
                                    sku: compSku,
                                    quantity: compQty
                                });
                            }
                        }
                    });
                });

                var payload = Object.values(productsMap);

                log.audit('Products to Sync', 'Total Unique Products: ' + payload.length);

                if (payload.length === 0) {
                    log.audit('Sync Complete', 'No products found.');
                    return;
                }

                // Batch the payloads if necessary (e.g., 500 at a time)
                var batchSize = 500;
                for (var i = 0; i < payload.length; i += batchSize) {
                    var batch = payload.slice(i, i + batchSize);
                    
                    var response = https.post({
                        url: SUPABASE_URL + '/rest/v1/rpc/sync_product_data',
                        headers: {
                            'apikey': SUPABASE_SERVICE_KEY,
                            'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({ payload: batch })
                    });

                    log.debug('Supabase Response Batch ' + (i/batchSize + 1), 'Status: ' + response.code + ' | Body: ' + response.body);
                    
                    if (response.code >= 400) {
                        log.error('Supabase Sync Failed', 'Status: ' + response.code + ' | Error: ' + response.body);
                    }
                }

                log.audit('Sync Complete', 'Successfully processed ' + payload.length + ' products.');

            } catch (e) {
                log.error('Error Syncing Products', e.message + '\n' + e.stack);
            }
        }

        return {
            execute: execute
        };
    });
