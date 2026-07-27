# Data Flow Diagram
1. NetSuite -> Supabase Sync (Customers, Items, Pricing)
2. Supabase -> Frontend (UI display via RLS)
3. Frontend -> Supabase (Order Requests, Activities)
4. Supabase -> Order Entry (Batch CSV Export)