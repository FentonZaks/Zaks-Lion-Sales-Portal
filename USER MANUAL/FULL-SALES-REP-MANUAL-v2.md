# Zaks Foods Sales Portal: Sales Rep Manual (v2 - Deep Dive)

## 1. System Access & Navigation

### Authentication
1. Navigate to the secure portal URL: `https://zaks-lion-sales-portal.vercel.app/`
2. Enter your authorized corporate email address and password.
3. **Password Resets:** If you forget your password, click the "Forgot Password" link on the login screen. You will receive an automated, secure reset link to your email.

### The Dashboard & Customer Hub
Upon successful login, you are presented with your personal Dashboard.
- **Territory Security:** You will only see the customers that have been explicitly assigned to your territory ID.
- **Global Search:** Use the search bar to instantly filter your customer list by Name, NetSuite ID, or City.
- **Customer Cards:** Clicking on any customer card navigates you to their detailed Profile Hub.

## 2. The Customer Profile & Activity Timeline

The Customer Profile is your central command center for interacting with an account.

### The Activity Timeline (CRM)
Located on the right side of the profile, the timeline provides a chronological history of the account.
- **Automated Logging:** Whenever you submit an order, the system automatically logs a "Draft invoice submitted to store" event.
- **Manual Notes & Visits:** Use the input box to manually log store visits, phone calls, or general account notes.
- **Follow-ups:** You can schedule future follow-up reminders to ensure no account falls through the cracks.

## 3. Deep Dive: Creating Orders & Invoices

The portal supports two entirely distinct transaction workflows, designed to handle both future warehouse shipments and live truck-deliveries.

### Workflow A: Standard Sales Orders
Use this workflow when a customer is placing a standard replenishment order that will be picked, packed, and shipped from the main corporate warehouse at a later date.

1. Click **Create New Order** on the customer profile.
2. The UI defaults to the **Sales Order** toggle. 
3. ******* WAREHOUSE GUARDRAIL *****:** Sales Orders are strictly locked to ship from **"Zaks - Main Warehouse YYC"**. The inventory numbers you see displayed on the catalog are pulling directly from this specific warehouse.
4. **Catalog Browsing & Kits:** 
   - You can search by SKU or description.
   - Products are grouped by category using expandable accordions.
   - The portal natively supports Kit items. It calculates kit pricing and availability based on the underlying component parts.
5. **Price Overrides:** If you need to offer a discount or override a price, click the **$** icon next to the item in your cart. You will be prompted to enter the new price. **You must enter a comment/justification** for the override, or the system will block the submission.
6. Click **Submit**. A PDF Draft Order and a CSV will be automatically generated and emailed to the corporate inbox for NetSuite processing.
7. The timeline will automatically update with your action.

### Workflow B: Direct Store Delivery (DSD) Invoices
Use this workflow when you are physically standing in the store, dropping off product directly from your vehicle's inventory, and bypassing the standard warehouse shipment process entirely.

1. Click **Create New Order** on the customer profile.
2. Toggle the order type button to **Direct Invoice (DSD)**.
3. ******* WAREHOUSE GUARDRAIL *****:** DSD Invoices are strictly locked to deduct inventory from **"Zaks - Edmonton Warehouse"** (which represents the DSD/Driver stock). 
   - The moment you click the DSD toggle, all inventory numbers on the screen will instantly snap to reflect the Edmonton warehouse. 
   - **Protection:** You CANNOT submit a DSD invoice if the quantity in your cart is greater than the available stock in the Edmonton warehouse. The app will strictly block you.
4. Build your cart.
5. Fill out the **Driver Note** field (e.g., "Left stock in back room"). This note will be permanently stamped on the final PDF receipt.
6. **Signature Capture:** 
   - Have the Store Manager/Owner type their name in the **Authorizer Name** field.
   - Have the Store Manager physically sign their name on the digital **Signature Pad** on your tablet/phone.
7. Click **Submit**. 
8. The system will generate a final, official **DSD Invoice Summary PDF**. The physical signature you captured is embedded directly onto the document. This PDF, along with the NetSuite import CSV, will be securely emailed to the corporate inbox.

## 4. Administrative Processing (NetSuite)
*(Note: This section is for Reps who also process their own orders in NetSuite, or for transparency into the backend).*
After the automated email is generated:
1. Download the attached `.csv` file.
2. Log in to Oracle NetSuite.
3. Navigate to your shortcuts and click either **Upload Sales Order CSV** or **Upload DSD Invoice CSV** depending on the order type.
4. Upload the CSV file. The custom Suitelet will parse the file, read the hardcoded warehouse locations, process the price overrides, and generate the live NetSuite transaction instantly.
