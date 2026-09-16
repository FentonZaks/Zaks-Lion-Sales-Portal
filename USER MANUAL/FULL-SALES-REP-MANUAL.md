# Zaks Foods Sales Portal: Sales Rep Manual

## 1. Getting Started

### Logging In
1. Navigate to the portal URL provided by your administrator.
2. Enter your authorized email address and password.
3. If you forget your password, use the "Forgot Password" link on the login screen to receive a reset email.

## 2. Navigating the Portal

### Dashboard & Customers
- Upon logging in, you will see a list of customers assigned to you.
- You can search for specific customers using the search bar.
- Click on a customer card to view their profile, past activity, and to start a new order or DSD invoice.

### Activity Timeline
The Customer Profile contains an **Activity Timeline** where you can:
- Log store visits and general notes.
- View a history of automatically logged events (like when you generate a draft order).
- Schedule future follow-ups.

## 3. Creating Orders & Invoices

When visiting a customer, you have two distinct workflows for moving product: **Sales Orders** and **Direct Invoices (DSD)**.

### Standard Sales Orders
Use this when a customer is placing an order that will be shipped from the main warehouse at a later date.

1. Click **Create New Order** on the customer profile.
2. The order type defaults to **Sales Order**. 
***** WAREHOUSE LOCK: Sales Orders are strictly locked to ship from "Zaks - Main Warehouse YYC". The inventory displayed will reflect this warehouse. *******
3. Browse the catalog or search for items, and use the **+** button to add quantities to the cart.
4. If you need to override a price, click the **$** icon next to the item in your cart, enter the new price, and **you must enter a comment/justification**.
5. Click **Submit**. A PDF Draft Order and a CSV will be automatically generated and emailed to your inbox.
6. The activity will be logged to the customer's timeline.

### Direct Store Delivery (DSD) Invoices
Use this when you are physically at the store, dropping off product from your vehicle, and bypassing the standard warehouse shipment process.

1. Click **Create New Order** on the customer profile.
2. Toggle the order type button to **Direct Invoice (DSD)**.
***** WAREHOUSE LOCK: DSD Invoices are strictly locked to deduct inventory from "Zaks - Edmonton Warehouse". The inventory displayed will instantly switch to reflect this warehouse. You CANNOT submit a DSD invoice if the Edmonton warehouse has zero stock for the item. *******
3. Add items to your cart.
4. Fill out the **Driver Note** (this will appear on the final PDF receipt).
5. Have the Store Manager/Owner type their name in the **Authorizer Name** field.
6. Have the Store Manager/Owner physically sign the **Signature** pad on your device.
7. Click **Submit**. 
8. A final **DSD Invoice Summary PDF** will be generated with the signature stamped directly on it. This PDF, along with the NetSuite import CSV, will be emailed to your inbox.
9. The activity timeline will automatically log "Draft invoice submitted to store".

## 4. Processing in NetSuite
After you receive the automated email containing your CSV:
1. Download the CSV attachment.
2. Log in to Oracle NetSuite.
3. Navigate to your shortcuts and click either **Upload Sales Order CSV** or **Upload DSD Invoice CSV** depending on what type of order you just generated.
4. Upload the CSV file and click Submit. NetSuite will automatically generate the live transaction.
