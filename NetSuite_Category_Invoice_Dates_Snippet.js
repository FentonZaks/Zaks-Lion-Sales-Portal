/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * 
 * This script calculates the last invoice dates by category for customers.
 */
define(['N/search', 'N/log', 'N/https'], function(search, log, https) {

    /**
     * Calculates the last invoice date for each target category for a given customer.
     * 
     * @param {string} customerId The internal ID of the customer in NetSuite
     * @returns {Object} An object mapping category names to their last invoice date (ISO string)
     */
    function getCategoryLastInvoiceDates(customerId) {
        const categoryDates = {};
        const TARGET_CATEGORIES = ['Candy', 'Die Cast Car', 'Gen Merch', 'Meat', 'Pet', 'Tech'];
        
        // We create a transaction search to find the latest invoice for this customer
        // that contains items in our target categories.
        const invoiceSearch = search.create({
            type: search.Type.INVOICE,
            filters: [
                ['mainline', 'is', 'F'], // We want item lines
                'AND',
                ['entity', 'anyof', customerId],
                'AND',
                ['taxline', 'is', 'F'],
                'AND',
                ['shipping', 'is', 'F']
            ],
            columns: [
                search.createColumn({ name: 'trandate', summary: search.Summary.MAX }),
                // Replace 'custitem_product_category' with the actual field ID where the category is stored on the Item record
                search.createColumn({ name: 'custitem_product_category', join: 'item', summary: search.Summary.GROUP })
            ]
        });

        invoiceSearch.run().each(result => {
            const categoryText = result.getText({ name: 'custitem_product_category', join: 'item', summary: search.Summary.GROUP });
            const maxDateStr = result.getValue({ name: 'trandate', summary: search.Summary.MAX });
            
            if (categoryText && maxDateStr && TARGET_CATEGORIES.includes(categoryText)) {
                const parsedDate = new Date(maxDateStr);
                categoryDates[categoryText] = parsedDate.toISOString();
            }
            return true;
        });

        return categoryDates;
    }

    function execute(context) {
        log.debug('Script Started', 'Ready to process category dates');
        
        // Example usage:
        // const customerId = '1234'; 
        // const dates = getCategoryLastInvoiceDates(customerId);
        // log.debug('Dates for ' + customerId, dates);
    }

    return {
        execute: execute,
        getCategoryLastInvoiceDates: getCategoryLastInvoiceDates
    };
});
