# Zaks / Lion Sales Portal - Administrator Runbook

## 1. Managing Access (Email Whitelist)
Only explicitly authorized emails can register for the portal.
- Go to the **Admin Sync Dashboard**.
- Add the user's email to the whitelist. (Both `@zaksfoods.ca` and `@gmail.com` domains are permitted, provided they are explicitly listed).
- If an unauthorized user attempts to sign up, the PostgreSQL trigger will automatically block them.

## 2. Processing Orders (Batch CSV)
The portal does not automatically create invoices in NetSuite.
1. Navigate to the **Review Queue**.
2. Review submitted orders (especially those flagged with price overrides).
3. Click **Generate Batch CSV**.
4. The system will automatically "explode" any Item Groups/Kits into their individual SKU components required for NetSuite.
5. Import the generated CSV file into the NetSuite Sales Order module.
6. Enter the newly generated NetSuite SO numbers back into the portal for tracking.

## 3. Data Synchronization
- The portal relies on a one-way sync from NetSuite. 
- Monitor the sync health on the Admin Sync Dashboard.
