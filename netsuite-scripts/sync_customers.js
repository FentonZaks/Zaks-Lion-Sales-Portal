/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 * 
 * DESCRIPTION:
 * Pushes Active Customer data from NetSuite Sandbox to the Supabase Sales Portal database.
 * Extracts basic customer info, primary contact, and default billing address.
 */

define(['N/search', 'N/https', 'N/log', 'N/runtime'],
    function(search, https, log, runtime) {

        function execute(scriptContext) {
            try {
                // 1. Configure Supabase Credentials
                const SUPABASE_URL = 'https://gurkqbfgvpxtxhzgjriy.supabase.co';
                const SUPABASE_SERVICE_KEY = 'sb_secret_hkuFUv_-XhIIyGH0QACdXQ_qUkOIj7n'; 

                var isProduction = runtime.envType === runtime.EnvType.PRODUCTION;

                // 2. Base Search Columns
                var columns = [
                    'internalid',
                    'companyname',
                    'terms',
                    'salesrep',
                    'balance',
                    'fxbalance', // Native Foreign Currency Balance
                    'subsidiarynohierarchy',
                    'currency',
                    'pricelevel',
                    'datecreated',
                    'custentity2', // Banner
                    'lastsaledate', // Native Last Sale Date
                    'custentity_date_lsa', // Custom Last Sale Date
                    
                    // Billing Address fields
                    'billaddress1',
                    'billcity',
                    'billstate',
                    'billzipcode',
                    'billcountry',
                    
                    // Shipping Address fields
                    'shipaddress1',
                    'shipcity',
                    'shipstate',
                    'shipzip',
                    'shipcountry',
                    
                    // Primary Contact fields
                    'contact',
                    'email',
                    'phone'
                ];

                if (isProduction) {
                    columns.push('custentity3'); // Route
                    columns.push('custentity4'); // Route Day
                    columns.push('custentity5'); // Channel
                }

                var customerSearch = search.create({
                    type: search.Type.CUSTOMER,
                    filters: [
                        ['isinactive', 'is', 'F']
                    ],
                    columns: columns
                });

                var pagedData = customerSearch.runPaged({ pageSize: 1000 });
                log.audit('Total Customers', `Found ${pagedData.count} active customers to sync.`);

                if (pagedData.count === 0) return;

                // 2.5 Secondary Search: Latest Invoice per Customer (Global Search)
                var latestInvoices = {};
                try {
                    var invoiceSearch = search.create({
                        type: search.Type.TRANSACTION,
                        filters: [
                            ['type', 'anyof', ['CustInvc', 'CashSale']],
                            'AND',
                            ['mainline', 'is', 'T']
                        ],
                        columns: [
                            search.createColumn({ name: 'entity', summary: search.Summary.GROUP }),
                            search.createColumn({ 
                                name: 'formulatext', 
                                formula: "TO_CHAR({trandate}, 'YYYY-MM-DD') || '|' || NVL({tranid}, 'Unknown') || '|' || NVL({fxamount}, {amount})",
                                summary: search.Summary.MAX
                            })
                        ]
                    });

                    var pagedInvoiceData = invoiceSearch.runPaged({ pageSize: 1000 });
                    pagedInvoiceData.pageRanges.forEach(function(pageRange) {
                        var page = pagedInvoiceData.fetch({ index: pageRange.index });
                        page.data.forEach(function(result) {
                            var custId = result.getValue({ name: 'entity', summary: search.Summary.GROUP });
                            var maxStr = result.getValue(result.columns[1]);
                            
                            if (custId && maxStr) {
                                var parts = maxStr.split('|');
                                latestInvoices[custId] = {
                                    date: parts[0],
                                    number: parts[1],
                                    amount: parseFloat(parts[2]) || 0.00
                                };
                            }
                        });
                    });
                    log.audit('Found Invoices', `Extracted latest invoice details for ${Object.keys(latestInvoices).length} customers.`);
                } catch (err) {
                    log.error('Invoice Search Error', err.message);
                }

                // 2.5.5 Category Last Invoice Dates
                var categoryDatesByCustomer = {};
                var TARGET_CATEGORIES = ['Candy', 'Die Cast Car', 'Gen Merch', 'Meat', 'Pet', 'Tech'];
                try {
                    var catInvoiceSearch = search.create({
                        type: search.Type.TRANSACTION,
                        filters: [
                            ['type', 'anyof', ['CustInvc', 'CashSale']],
                            'AND',
                            ['mainline', 'is', 'F'],
                            'AND',
                            ['taxline', 'is', 'F'],
                            'AND',
                            ['shipping', 'is', 'F']
                        ],
                        columns: [
                            search.createColumn({ name: 'entity', summary: search.Summary.GROUP }),
                            search.createColumn({ name: 'class', join: 'item', summary: search.Summary.GROUP }),
                            search.createColumn({ name: 'trandate', summary: search.Summary.MAX, sort: search.Sort.DESC })
                        ]
                    });

                    var pagedCatData = catInvoiceSearch.runPaged({ pageSize: 1000 });
                    pagedCatData.pageRanges.forEach(function(pageRange) {
                        var page = pagedCatData.fetch({ index: pageRange.index });
                        page.data.forEach(function(result) {
                            var custId = result.getValue({ name: 'entity', summary: search.Summary.GROUP });
                            var catTextRaw = result.getText({ name: 'class', join: 'item', summary: search.Summary.GROUP }) || '';
                            var primaryCat = catTextRaw.indexOf(' : ') !== -1 ? catTextRaw.split(' : ')[0] : catTextRaw;
                            var maxDateStr = result.getValue({ name: 'trandate', summary: search.Summary.MAX });

                            if (custId && catTextRaw && maxDateStr && TARGET_CATEGORIES.indexOf(primaryCat) !== -1) {
                                if (!categoryDatesByCustomer[custId]) {
                                    categoryDatesByCustomer[custId] = {};
                                }
                                categoryDatesByCustomer[custId][catTextRaw] = new Date(maxDateStr).toISOString();
                            }
                        });
                    });
                    log.audit('Category Dates', `Extracted category dates for ${Object.keys(categoryDatesByCustomer).length} customers.`);
                } catch (err) {
                    log.error('Category Search Error', err.message);
                }
                // 2.6 Revenue Summary Searches (MTD & YTD)
                var mtdRevenue = {};
                var ytdRevenue = {};
                var lastMonthRevenue = {};
                try {
                    // Shared filters for Net Revenue (Invoices, Cash Sales, Credit Memos, Cash Refunds)
                    var revenueTypes = ['CustInvc', 'CashSale', 'CustCred', 'CashRfnd'];
                    
                    // MTD Search
                    var mtdSearch = search.create({
                        type: search.Type.TRANSACTION,
                        filters: [
                            ['type', 'anyof', revenueTypes],
                            'AND',
                            ['mainline', 'is', 'T'],
                            'AND',
                            ['trandate', 'within', 'thismonth']
                        ],
                        columns: [
                            search.createColumn({ name: 'entity', summary: search.Summary.GROUP }),
                            search.createColumn({ name: 'fxamount', summary: search.Summary.SUM })
                        ]
                    });
                    
                    mtdSearch.run().each(function(result) {
                        var custId = result.getValue({ name: 'entity', summary: search.Summary.GROUP });
                        var amount = parseFloat(result.getValue({ name: 'fxamount', summary: search.Summary.SUM })) || 0.00;
                        mtdRevenue[custId] = amount;
                        return true;
                    });
                    
                    // YTD Search
                    var ytdSearch = search.create({
                        type: search.Type.TRANSACTION,
                        filters: [
                            ['type', 'anyof', revenueTypes],
                            'AND',
                            ['mainline', 'is', 'T'],
                            'AND',
                            ['trandate', 'within', 'thisyear']
                        ],
                        columns: [
                            search.createColumn({ name: 'entity', summary: search.Summary.GROUP }),
                            search.createColumn({ name: 'fxamount', summary: search.Summary.SUM })
                        ]
                    });
                    
                    ytdSearch.run().each(function(result) {
                        var custId = result.getValue({ name: 'entity', summary: search.Summary.GROUP });
                        var amount = parseFloat(result.getValue({ name: 'fxamount', summary: search.Summary.SUM })) || 0.00;
                        ytdRevenue[custId] = amount;
                        return true;
                    });
                    
                    // Last Month Search
                    var lmtdSearch = search.create({
                        type: search.Type.TRANSACTION,
                        filters: [
                            ['type', 'anyof', revenueTypes],
                            'AND',
                            ['mainline', 'is', 'T'],
                            'AND',
                            ['trandate', 'within', 'lastmonth']
                        ],
                        columns: [
                            search.createColumn({ name: 'entity', summary: search.Summary.GROUP }),
                            search.createColumn({ name: 'fxamount', summary: search.Summary.SUM })
                        ]
                    });
                    
                    lmtdSearch.run().each(function(result) {
                        var custId = result.getValue({ name: 'entity', summary: search.Summary.GROUP });
                        var amount = parseFloat(result.getValue({ name: 'fxamount', summary: search.Summary.SUM })) || 0.00;
                        lastMonthRevenue[custId] = amount;
                        return true;
                    });
                    
                    log.audit('Revenue Searches', `Extracted MTD revenue for ${Object.keys(mtdRevenue).length}, YTD for ${Object.keys(ytdRevenue).length}, and Last Month for ${Object.keys(lastMonthRevenue).length} customers.`);
                } catch (err) {
                    log.error('Revenue Search Error', err.message);
                }

                // Iterate over each page of customers (1000 per batch)
                pagedData.pageRanges.forEach(function(pageRange) {
                    var page = pagedData.fetch({ index: pageRange.index });
                    var customersToSync = [];
                    
                    page.data.forEach(function(result) {
                        var contactName = result.getText('contact') || '';
                        var nameParts = contactName.split(' ');
                        var firstName = nameParts[0] || null;
                        var lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

                        var cId = result.getValue('internalid');
                        var inv = latestInvoices[cId];
                        var mtd = mtdRevenue[cId] || 0.00;
                        var ytd = ytdRevenue[cId] || 0.00;
                        var lmtd = lastMonthRevenue[cId] || 0.00;
                        var catDates = categoryDatesByCustomer[cId] || {};
                        
                        var nativeBalance = result.getValue('fxbalance') || result.getValue('balance');

                        customersToSync.push({
                            net_suite_id: cId,
                            name: result.getValue('companyname') || 'Unknown',
                            terms: result.getText('terms') || null,
                            salesrep: result.getText('salesrep') || null,
                            balance: parseFloat(nativeBalance) || 0.00,
                            subsidiary: result.getText('subsidiarynohierarchy') || null,
                            currency: result.getText('currency') || null,
                            price_level: result.getText('pricelevel') || null,
                            date_created: result.getValue('datecreated') || null,
                            banner: result.getText('custentity2') || null,
                            date_of_last_sale: result.getValue('lastsaledate') || result.getValue('custentity_date_lsa') || null,
                            last_invoice_date: inv ? inv.date : null,
                            last_invoice_amount: inv ? inv.amount : 0.00,
                            last_invoice_number: inv ? inv.number : null,
                            mtd_revenue: mtd,
                            ytd_revenue: ytd,
                            last_month_revenue: lmtd,
                            category_last_invoice_dates: catDates,
                            
                            route: isProduction ? result.getText('custentity3') : null,
                            route_day: isProduction ? result.getText('custentity4') : null,
                            channel: isProduction ? result.getText('custentity5') : null,

                            contact: {
                                first_name: firstName,
                                last_name: lastName,
                                email: result.getValue('email') || null,
                                phone: result.getValue('phone') || null
                            },
                            billing_address: {
                                address_line_1: result.getValue('billaddress1') || null,
                                city: result.getValue('billcity') || null,
                                province: result.getValue('billstate') || null,
                                postal_code: result.getValue('billzipcode') || null,
                                country: result.getValue('billcountry') || null
                            },
                            shipping_address: {
                                address_line_1: result.getValue('shipaddress1') || null,
                                city: result.getValue('shipcity') || null,
                                province: result.getValue('shipstate') || null,
                                postal_code: result.getValue('shipzip') || null,
                                country: result.getValue('shipcountry') || null
                            }
                        });
                    });

                    // Push batch to Supabase
                    var response = https.post({
                        url: SUPABASE_URL + '/rest/v1/rpc/sync_customer_data',
                        headers: {
                            'apikey': SUPABASE_SERVICE_KEY,
                            'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ payload: customersToSync })
                    });

                    if (response.code === 200 || response.code === 204) {
                        log.audit('Batch Sync Successful', `Upserted batch of ${customersToSync.length} customers.`);
                    } else {
                        log.error('Batch Sync Failed', `Supabase returned ${response.code}: ${response.body}`);
                    }
                });

            } catch (e) {
                log.error('Unexpected Error', e.message);
            }
        }

        return {
            execute: execute
        };
    });
