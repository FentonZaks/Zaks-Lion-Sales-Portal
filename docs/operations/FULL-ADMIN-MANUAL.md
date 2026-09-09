# Zaks Sales Portal: Complete Administrator Manual

As an Administrator, you have access to the complete suite of tools in the Zaks Sales Portal. You can perform all the daily CRM tasks that a Sales Representative can, with the addition of global oversight, data synchronization management, and user administration.

---

## 1. Core Functions (The Sales Rep Experience)
You have full access to the standard toolset. Please refer to the **Complete Sales Representative Manual** for detailed instructions on:
* **The Sales Dashboard:** Viewing metrics and charts.
* **The Customer Profile:** Logging store visits, adding follow-ups, uploading store pictures, and viewing order history.

---

## 2. Global Oversight & Management

### The Global Customers Page
While Sales Reps can only see accounts explicitly assigned to them in NetSuite, your Administrator role bypasses all territorial restrictions (Row Level Security).
* When you navigate to the **Customers** tab, you have access to the entire company database.
* **Sales Rep Filter:** You have an exclusive dropdown menu at the top of the screen labeled "All Sales Reps." You can use this to instantly filter the customer list to view only the accounts assigned to a specific representative, allowing you to audit their territory and follow-ups.

### Monitoring Sales Rep Activity
Because you can see all customers, you can sort the global list by **Last Activity Date** or **Open Follow-ups**. This allows you to quickly run audits on which representatives are logging their store visits and who has overdue tasks.

---

## 3. Data Sync & System Administration

### The Admin Dashboard
Navigate to the **Admin Dashboard** (often labeled Admin or Sync Logs) to monitor the health of the connection between the Sales Portal and NetSuite.
* **Sync Logs:** Here you can see a live feed of the automated data pipelines (Customers, Products, Orders). 
* **Troubleshooting:** If a sales rep complains that a new customer hasn't appeared, check the Admin Dashboard to ensure the nightly NetSuite Scheduled Script executed successfully.

### Managing Users
*(Depending on your specific Supabase configuration)*: 
New Sales Representatives are typically added by inviting them via the Supabase Auth dashboard and assigning them the `SALES` role in the `user_roles` database table. Ensure their email address perfectly matches the email address assigned to them on their NetSuite Employee record, as this is how the portal maps territories.

---

## 4. Managing New Customer Requests

When a Sales Representative fills out the "New Customer" application in the portal, the request is routed to you for approval.
1. You will receive an automated email containing a **PDF Summary** and a **CSV Data File**.
2. Review the PDF to ensure the request is valid.
3. Open the CSV file in Excel to quickly verify data formatting (e.g., spelling, correct columns).
4. Save the CSV and upload it to NetSuite using the **Sales Portal: Create Customer from CSV** Suitelet.
5. The Suitelet will automatically build the Customer Record, the Address Book, and the associated Primary/AP Contacts.

*For step-by-step technical instructions on this workflow, please refer to the standalone **Administrator Manual: New Customer Import** document.*

---

## 5. Future Capabilities (Draft Orders & Restrictions)
As the portal evolves, Administrators will gain access to tools like the **Product Restrictions Manager** (preventing certain customers from ordering restricted items) and the **Sales Order Importer** (uploading drafted orders from the portal directly into NetSuite). These modules will feature their own dedicated documentation as they are deployed.
