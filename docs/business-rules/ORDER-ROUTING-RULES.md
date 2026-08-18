# Zaks Sales Portal: Order Routing Rules

This document outlines the core business logic used by the Draft Order System to route inventory and enforce geographical restrictions.

## 1. Geographical Restrictions (Province & Country Blocks)
NetSuite does not natively hold provincial or country-level sales restrictions. 
To accommodate localized compliance (e.g., restricted ingredients or exclusive territory distribution rights), the portal uses a **Frontend Restrictions Table**.

### Logic
- **`allowed_provinces`**: An array of allowed Province/State codes (e.g., `["BC", "AB", "ON"]`).
- **`allowed_countries`**: An array of allowed Country codes (e.g., `["CA", "US"]`).
- If both arrays are `NULL` or empty, the product is assumed to be **globally available**.
- During the Draft Order creation, the system extracts the `province` and `country` from the selected Customer's primary **Shipping Address**. 
- Any product in the catalog that is restricted from that specific shipping address will be completely hidden from the rep's view.

## 2. Multi-Warehouse Inventory Routing

### The Primary Warehouse Selection
At the top of every Draft Order, the sales rep must select a **Preferred Shipping Warehouse** (e.g., "Toronto", "Vancouver"). 

### Inventory Fallback & Split Orders
- When a rep expands a product category, the UI will display the inventory exclusively available at the *Preferred Shipping Warehouse*.
- **Stock-Out Scenario**: If the item has `0` quantity at the Preferred Shipping Warehouse, the Draft Order engine will scan the `inventory_by_location` JSON payload synced from NetSuite.
- **Split Recommendation**: If the engine detects inventory in a *different* warehouse, it will render a prominent UI badge (e.g., "Out of stock in Toronto, but 50 available in Vancouver").
- The rep can then choose to add the item anyway, and the system will tag that specific order line to be fulfilled by the alternative warehouse, effectively creating a "Split Shipment" request when it is exported to NetSuite.
