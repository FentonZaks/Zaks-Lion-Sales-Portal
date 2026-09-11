-- Add sort_rank and override_category to products table
ALTER TABLE public.products
ADD COLUMN sort_rank INT DEFAULT 0,
ADD COLUMN override_category TEXT;

-- Recreate the bulk_update_products RPC to include these fields
CREATE OR REPLACE FUNCTION bulk_update_products(payload JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    product_record JSONB;
BEGIN
    FOR product_record IN SELECT * FROM jsonb_array_elements(payload)
    LOOP
        UPDATE public.products
        SET
            allowed_provinces = (SELECT array_agg(x) FROM jsonb_array_elements_text(product_record->'allowed_provinces') x),
            allowed_countries = (SELECT array_agg(x) FROM jsonb_array_elements_text(product_record->'allowed_countries') x),
            is_hidden = (product_record->>'is_hidden')::boolean,
            is_kit_only = (product_record->>'is_kit_only')::boolean,
            inner_carton_qty = (product_record->>'inner_carton_qty')::bigint,
            master_case_qty = (product_record->>'master_case_qty')::bigint,
            is_archived = (product_record->>'is_archived')::boolean,
            override_category = product_record->>'override_category',
            sort_rank = COALESCE((product_record->>'sort_rank')::int, 0),
            updated_at = NOW()
        WHERE sku = product_record->>'sku';
    END LOOP;
END;
$$;
