
// Simulates the logic for exploding kits and generating the Batch CSV

export function generateBatchCsv(orders: any[], itemGroups: any[]) {
    const csvRows = [
        ['Portal_Order_ID', 'Customer_ID', 'Item_ID', 'Qty', 'Unit_Price', 'Override_Comment']
    ];

    orders.forEach(order => {
        order.lines.forEach((line: any) => {
            // Check if item is a kit/item group
            const groupDef = itemGroups.find(g => g.kit_product_id === line.product_id);
            
            if (groupDef) {
                // Explode the kit into its individual NetSuite items
                groupDef.components.forEach((comp: any) => {
                    csvRows.push([
                        order.portal_order_id,
                        order.customer_id,
                        comp.product_id,
                        line.quantity * comp.quantity, // Multiply by kit qty
                        comp.allocated_price,
                        line.override_comment || ''
                    ]);
                });
            } else {
                // Standard item
                csvRows.push([
                    order.portal_order_id,
                    order.customer_id,
                    line.product_id,
                    line.quantity,
                    line.unit_price,
                    line.override_comment || ''
                ]);
            }
        });
    });

    return csvRows.map(row => row.join(',')).join('\n');
}
