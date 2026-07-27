-- 00004_reporting.sql

-- 1. Sales Performance View
CREATE OR REPLACE VIEW public.vw_sales_performance WITH (security_invoker = true) AS
SELECT 
    DATE_TRUNC('month', o.created_at) as month,
    u.id as rep_id,
    u.first_name || ' ' || u.last_name as rep_name,
    COUNT(o.id) as total_orders,
    SUM(o.subtotal) as total_sales_value
FROM public.orders o
JOIN public.user_profiles u ON o.user_id = u.id
WHERE o.status != 'DRAFT'
GROUP BY DATE_TRUNC('month', o.created_at), u.id, u.first_name, u.last_name;

-- 2. Activity Metrics View
CREATE OR REPLACE VIEW public.vw_activity_metrics WITH (security_invoker = true) AS
SELECT 
    DATE_TRUNC('week', a.activity_date) as week,
    u.id as rep_id,
    u.first_name || ' ' || u.last_name as rep_name,
    a.activity_type,
    COUNT(a.id) as activity_count
FROM public.activities a
JOIN public.user_profiles u ON a.user_id = u.id
GROUP BY DATE_TRUNC('week', a.activity_date), u.id, u.first_name, u.last_name, a.activity_type;

-- Note on Security:
-- By using 'security_invoker = true', these views will automatically respect the RLS policies 
-- of their underlying tables (orders, activities) based on the user running the query.
