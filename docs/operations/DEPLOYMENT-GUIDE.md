# Zaks / Lion Sales Portal: Deployment Guide

This document outlines the step-by-step procedures required to deploy the application into both the **Staging (Testing)** environment and the **Production (Launch)** environment.

---

## 1. Prerequisites

Before beginning any deployment, ensure you have the following accounts and credentials ready:
1. **GitHub Account**: Access to the source code repository.
2. **Supabase Account**: Owner access to create and manage the database projects.
3. **Vercel / Netlify Account** (or similar hosting provider): To host the React frontend.
4. **NetSuite Sandbox / Production Accounts**: Administrator access to generate OAuth 2.0 credentials for data synchronization.
5. **DNS Registrar Access**: To configure the custom domain (`sales.zaksfoods.ca`).

---

## 2. Staging Environment Deployment (Testing Phase)

The Staging environment is an exact replica of production but connects only to the NetSuite Sandbox. It is used for User Acceptance Testing (UAT).

### Step 2.1: Supabase Backend Setup (Staging)
1. **Create Project**: Log into Supabase and create a new project named `zaks-sales-portal-staging`.
2. **Apply Migrations**: 
   - Open the Supabase SQL Editor.
   - Run the migration scripts from `/supabase/migrations/` in sequential order:
     1. `20260724000000_foundation.sql` (Creates users, roles, RLS)
     2. `20260724000001_crm.sql` (Creates customers, activities)
     3. `20260724000002_orders.sql` (Creates products, pricing, orders)
     4. `20260724000003_reporting.sql` (Creates analytics views)
3. **Configure Authentication**: 
   - Go to Authentication > Providers.
   - Enable Email/Password.
   - Disable "Confirm Email" if you are manually whitelisting and setting passwords for testers.
4. **Seed Test Data**: 
   - Manually insert your testers' email addresses into the `authorized_emails` table using the Supabase Table Editor so they are not blocked by the security trigger.
5. **Get Credentials**: Note down the `Project URL` and `anon public key` from Settings > API.

### Step 2.2: Frontend Deployment (Staging)
1. **Host Configuration**: Log into Vercel (or your chosen host) and import the GitHub repository.
2. **Set Root Directory**: Ensure the build command targets the `/portal-app/` directory.
   - Build Command: `npm run build`
   - Install Command: `npm install`
3. **Environment Variables**: Add the following Environment Variables in Vercel:
   - `VITE_SUPABASE_URL`: [Your Staging Project URL]
   - `VITE_SUPABASE_ANON_KEY`: [Your Staging Anon Key]
4. **Deploy**: Trigger the deployment. Vercel will generate a temporary URL (e.g., `zaks-portal-staging.vercel.app`).
5. **Test**: Provide this URL to your 10 initial reps for testing. Have them draft orders and override prices to ensure the NetSuite CSV export functions flawlessly.

---

## 3. Production Environment Deployment (Launch Phase)

Once UAT is approved in Staging, repeat the process for the live Production environment.

### Step 3.1: Supabase Backend Setup (Production)
1. **Create Project**: Create a new Supabase project named `zaks-sales-portal-prod`.
2. **Apply Migrations**: Execute the exact same SQL migrations (1 through 4) in the Production SQL Editor.
3. **Configure Authentication**: Set up Email/Password auth exactly as in Staging.
4. **Seed Live Users**: Upload the official Excel list of authorized users into the `authorized_emails` table. **Do not skip this step, or no one will be able to log in.**
5. **Get Credentials**: Note down the Production `Project URL` and `anon public key`.

### Step 3.2: Frontend Deployment (Production)
1. **Host Configuration**: In Vercel, create a new project pointing to the same repository (or use the same project but map the Production environment).
2. **Environment Variables**: Update the variables to point to the Production Supabase keys:
   - `VITE_SUPABASE_URL`: [Your Production Project URL]
   - `VITE_SUPABASE_ANON_KEY`: [Your Production Anon Key]
3. **Deploy**: Trigger the Production build.

### Step 3.3: DNS Configuration (Custom Domain)
1. **Domain Settings**: In Vercel, go to Settings > Domains.
2. **Add Domain**: Enter `sales.zaksfoods.ca`.
3. **DNS Registrar**: Log into your DNS provider (e.g., GoDaddy, Cloudflare) and add the CNAME or A Record provided by Vercel to point `sales` to the Vercel servers.
4. **SSL**: Wait a few minutes for Vercel to automatically provision the SSL certificate.

### Step 3.4: Final Security & NetSuite Checks
1. **NetSuite Live Connection**: Update your Edge Functions or sync scripts to point to the live NetSuite Production API rather than the Sandbox.
2. **Verify Whitelist**: Attempt to log in with a personal, unlisted email address to confirm the database trigger actively blocks unauthorized access.
3. **Monitor Logs**: Monitor the `AdminSyncDashboard` for the first 24 hours to ensure the NetSuite item catalog and customer data is syncing perfectly.

---

## 4. Post-Launch CI/CD Pipeline
- **Continuous Integration**: The `.github/workflows/ci.yml` file will automatically test any new code pushed to the `main` branch.
- **Continuous Deployment**: Once code is merged into `main`, Vercel will automatically detect the change and seamlessly deploy the updates to `sales.zaksfoods.ca` without downtime.

---

## 5. NetSuite Sync Scripts Setup

To ensure data seamlessly flows from NetSuite to the Supabase portal, two SuiteScripts must be deployed in NetSuite. Please follow these exact steps to ensure they are logged correctly for future handoffs.

### 5.1. Customer Sync Script
1. **Upload File**: Navigate to **Customization > Scripting > Scripts > New**. Upload `sync_customers.js` from the `/netsuite-scripts/` folder.
2. **Create Script Record**:
   - **Name**: `Zaks Sales Portal - Customer Sync`
   - **ID**: `_zaks_portal_cust_sync`
   - **Type**: Scheduled Script
3. **Deploy Script**:
   - Navigate to the Deployments tab.
   - **Applies To**: Ensure it is left blank or appropriately targeted if necessary (though it is a scheduled script).
   - **Status**: Testing (for Sandbox) or Scheduled (for Production).
   - **Schedule**: Set to run every 15 or 30 minutes, depending on the business requirement for customer data freshness.

### 5.2. Product Sync Script
1. **Upload File**: Navigate to **Customization > Scripting > Scripts > New**. Upload `sync_products.js` from the `/netsuite-scripts/` folder.
2. **Create Script Record**:
   - **Name**: `Zaks Sales Portal - Product Sync`
   - **ID**: `_zaks_portal_prod_sync`
   - **Type**: Scheduled Script
3. **Deploy Script**:
   - Navigate to the Deployments tab.
   - **Status**: Testing (for Sandbox) or Scheduled (for Production).
   - **Schedule**: Set to run every 1 to 4 hours. Product data (and inventory) changes frequently, but fetching the entire catalog is heavy. Adjust this cadence based on your inventory volatility.

> **Note for Future Admins**: Both scripts contain hardcoded Supabase URLs and Service Keys at the top of the file (`execute` function). When moving from Sandbox to Production, you **must** update these two variables in the script files to point to the `zaks-sales-portal-prod` Supabase project credentials.
