# Authentication Design
- Provider: Supabase Auth.
- Flow: Email/Password -> 2FA verification if >30 days -> Check against `AllowedUsers` table.