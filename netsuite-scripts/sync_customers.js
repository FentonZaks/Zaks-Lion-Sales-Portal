/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 * 
 * DESCRIPTION:
 * Pushes Active Customer data from NetSuite Sandbox to the Supabase Sales Portal database.
 * Runs nightly to keep the Reps' offline CRM data in sync.
 */

define(['N/search', 'N/https', 'N/log', 'N/runtime'],
    function(search, https, log, runtime) {

        function execute(scriptContext) {
            try {
                // 1. Configure Supabase Credentials
                // In production, these should be stored in NetSuite Secret Management, not hardcoded.
                const SUPABASE_URL = 'https://gurkqbfgvpxtxhzgjriy.supabase.co';
                const SUPABASE_SERVICE_KEY = 'ENTER_YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE'; 

                // 2. Search for Active Customers
                var customerSearch = search.create({
                    type: search.Type.CUSTOMER,
                    filters: [
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        'internalid',
                        'companyname',
                        'email',
                        'phone',
                        'salesrep',
                        'balance'
                    ]
                });

                var customersToSync = [];
                customerSearch.run().each(function(result) {
                    customersToSync.push({
                        net_suite_id: result.getValue('internalid'),
                        name: result.getValue('companyname') || 'Unknown',
                        balance: parseFloat(result.getValue('balance')) || 0.00
                    });
                    return true; 
                });

                log.audit('Found Customers', `Syncing ${customersToSync.length} customers to Supabase.`);

                if (customersToSync.length === 0) return;

                // 3. Push to Supabase via REST API
                var response = https.post({
                    url: SUPABASE_URL + '/rest/v1/customers',
                    headers: {
                        'apikey': SUPABASE_SERVICE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
                        'Content-Type': 'application/json',
                        'Prefer': 'resolution=merge-duplicates' // Upsert logic
                    },
                    body: JSON.stringify(customersToSync)
                });

                if (response.code === 201 || response.code === 200) {
                    log.audit('Sync Successful', 'Successfully upserted customers into Supabase.');
                } else {
                    log.error('Sync Failed', `Supabase returned ${response.code}: ${response.body}`);
                }

            } catch (e) {
                log.error('Unexpected Error', e.message);
            }
        }

        return {
            execute: execute
        };
    });
