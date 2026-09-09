# Zaks Sales Portal - Development Session Log (Aug 2026)

This document serves as a reference for the major development changes, bug fixes, and security incidents resolved during the late-August 2026 development session.

## 1. Role-Based Access Control & Navigation
- We established strict access controls around the portal's features based on Supabase User Roles (`ADMIN`, `MANAGER`, `SALES`).
- The **"New Customer"** tab and the **"Admin / IT Sync"** tab are now strictly limited to users with the `ADMIN` role. 
- Regular Sales Reps and Managers (like the newly invited 'Jarvis' and 'Rickie' accounts) will not see these sensitive admin options.
- We fixed a bug where the Admin wrapper accidentally leaked visibility of the "Admin / IT Sync" tab to non-admins.

## 2. Security Incident: Supabase Service Key Leak
- **The Issue:** A Supabase `service_role` secret key was hardcoded into the `sync_customers.js` and `sync_products.js` NetSuite scripts. When these files were pushed to GitHub, GitHub's automated security scanners detected the key and immediately notified Supabase.
- **The Consequence:** Supabase permanently revoked the leaked key to protect the database, which instantly broke the automated NetSuite sync scripts.
- **The Protocol for the Future:** 
  1. We completely scrubbed the codebase of any hardcoded secrets. The code in GitHub now uses the placeholder `YOUR_SUPABASE_SERVICE_ROLE_KEY`.
  2. If the Service Key ever needs to be rolled again, it must be generated in the Supabase Dashboard (under API -> Secret Keys).
  3. The real key must **only** be pasted directly into the Script Editor inside the NetSuite UI online. It must **never** be saved into the local `.js` files on your computer.

## 3. Authentication & Password Recovery Flow
- We added a **"Forgot Password?"** button to the main login screen (`Auth.tsx`).
- **Supabase Configuration:** We updated the Supabase URL Configuration (Site URL) to point to the live Vercel app (`https://zaks-lion-sales-portal.vercel.app`) so that password reset emails correctly redirect users back to the live portal instead of `localhost`.
- **New UI Built:** We built a dedicated `UpdatePassword.tsx` screen. When a user clicks a password reset link in their email, the app detects the `PASSWORD_RECOVERY` event and displays a secure form to type in their new password.
- **Bypassing Email Rate Limits:** We discovered that if you hit Supabase's hourly email rate limit (for invites/resets), you can bypass it entirely by running a direct SQL command in the Supabase SQL Editor:
  ```sql
  UPDATE auth.users
  SET encrypted_password = crypt('YourNewPasswordHere!', gen_salt('bf'))
  WHERE email = 'user@zaksfoods.ca';
  ```

## 4. UI/UX: Desktop Table Formatting
- The "Assigned Customers" table on the Sales Dashboard was getting cut off on desktop screens due to a strict `1200px` max-width constraint and awkward text wrapping.
- **The Fix:**
  - Expanded the portal's max-width to `1600px` to comfortably fill large desktop monitors.
  - Reduced empty cell padding from `1rem` to `0.75rem 0.5rem` to tighten up the columns.
  - Shrunk the table font size slightly to `14px`.
  - Applied `white-space: nowrap` specifically to the Revenue and Date columns so that numbers never awkwardly wrap onto two lines, while allowing headers like "Open Follow-ups" to wrap normally.
