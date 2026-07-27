# Incident Response Plan

## 1. Sync Failures
- **Symptom:** Customers or items are missing/outdated.
- **Action:** Check the Edge Function logs in Supabase. Fall back to manual CSV import if the API is down.

## 2. Unauthorized Access Attempts
- **Symptom:** Audit logs show repeated failed logins.
- **Action:** Verify the 2FA settings are active. Confirm the `authorized_emails` table is strictly maintained. Lock the user account via the Supabase dashboard if compromised.
