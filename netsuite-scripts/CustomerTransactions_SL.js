/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/query', 'N/render', 'N/runtime'], function (query, render, runtime) {
    function onRequest(context) {
        var request = context.request;
        var response = context.response;

        try {
            var action = request.parameters.action;
            var token = request.parameters.token;

            // Security check using script parameter
            var scriptObj = runtime.getCurrentScript();
            var expectedToken = scriptObj.getParameter({ name: 'custscript_portal_api_secret' });

            if (!expectedToken || token !== expectedToken) {
                response.write(JSON.stringify({ error: 'Unauthorized access.' }));
                return;
            }

            if (action === 'get_transactions') {
                var customerId = request.parameters.customer_id;
                if (!customerId) {
                    response.write(JSON.stringify({ error: 'Missing customer_id parameter.' }));
                    return;
                }

                // 1. Get Open Sales Orders
                // Statuses: A=Pending Approval, B=Pending Fulfillment, D=Partially Fulfilled, E=Pending Billing/Partially Fulfilled, F=Pending Billing
                var soQuery = `
                    SELECT 
                        id, 
                        tranid, 
                        trandate, 
                        foreigntotal as total, 
                        BUILTIN.DF(status) as status_display
                    FROM transaction
                    WHERE type = 'SalesOrd'
                      AND entity = ?
                      AND status IN ('SalesOrd:A', 'SalesOrd:B', 'SalesOrd:D', 'SalesOrd:E', 'SalesOrd:F')
                    ORDER BY trandate DESC
                `;
                var soResults = query.runSuiteQL({ query: soQuery, params: [customerId] }).asMappedResults();

                // 2. Get Recent Invoices
                var invQuery = `
                    SELECT 
                        id, 
                        tranid, 
                        trandate, 
                        foreigntotal as total, 
                        BUILTIN.DF(status) as status_display
                    FROM transaction
                    WHERE type = 'CustInvc'
                      AND entity = ?
                    ORDER BY trandate DESC
                `;
                var invResults = query.runSuiteQL({ query: invQuery, params: [customerId] }).asMappedResults();
                var recentInvoices = invResults.slice(0, 3); // Grab top 3

                response.setHeader({ name: 'Content-Type', value: 'application/json' });
                response.write(JSON.stringify({
                    sales_orders: soResults,
                    invoices: recentInvoices
                }));

            } else if (action === 'get_pdf') {
                var transactionId = request.parameters.transaction_id;
                if (!transactionId) {
                    response.write(JSON.stringify({ error: 'Missing transaction_id parameter.' }));
                    return;
                }

                var pdfFile = render.transaction({
                    entityId: Number(transactionId),
                    printMode: render.PrintMode.PDF
                });

                // Return the raw PDF bytes
                response.setHeader({ name: 'Content-Type', value: 'application/pdf' });
                response.writeFile({ file: pdfFile, isInline: true });

            } else {
                response.write(JSON.stringify({ error: 'Invalid action parameter.' }));
            }
        } catch (e) {
            response.write(JSON.stringify({ error: 'An unexpected error occurred.', details: e.message }));
        }
    }

    return {
        onRequest: onRequest
    };
});
