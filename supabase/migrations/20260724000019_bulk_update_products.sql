
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
            updated_at = NOW()
        WHERE sku = product_record->>'sku';
    END LOOP;
END;
$$;
