-- Migration: Create RPC to safely fetch distinct dropdown options bypassing RLS
CREATE OR REPLACE FUNCTION get_form_dropdown_options()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'banners', (SELECT coalesce(json_agg(t.val), '[]'::json) FROM (SELECT DISTINCT banner AS val FROM customers WHERE banner IS NOT NULL AND banner != '' ORDER BY banner) t),
    'channels', (SELECT coalesce(json_agg(t.val), '[]'::json) FROM (SELECT DISTINCT channel AS val FROM customers WHERE channel IS NOT NULL AND channel != '' ORDER BY channel) t),
    'price_levels', (SELECT coalesce(json_agg(t.val), '[]'::json) FROM (SELECT DISTINCT price_level AS val FROM customers WHERE price_level IS NOT NULL AND price_level != '' ORDER BY price_level) t),
    'sales_reps', (SELECT coalesce(json_agg(t.val), '[]'::json) FROM (SELECT DISTINCT salesrep AS val FROM customers WHERE salesrep IS NOT NULL AND salesrep != '' ORDER BY salesrep) t)
  );
$$;
