
ALTER TABLE public.products ALTER COLUMN inner_carton_qty TYPE BIGINT;
ALTER TABLE public.products ALTER COLUMN master_case_qty TYPE BIGINT;

CREATE OR REPLACE FUNCTION sync_product_data(payload JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    product_record JSONB;
BEGIN
    FOR product_record IN SELECT * FROM jsonb_array_elements(payload)
    LOOP
        INSERT INTO public.products (
            net_suite_id, sku, name, description, base_price, estimated_inventory, 
            inventory_by_location, primary_category, secondary_category, is_active, 
            is_hidden, is_kit_only, inner_carton_qty, master_case_qty, updated_at
        )
        VALUES (
            product_record->>'net_suite_id',
            product_record->>'sku',
            product_record->>'name',
            COALESCE(product_record->>'description', ''),
            COALESCE((product_record->>'base_price')::numeric, 0.00),
            COALESCE((product_record->>'estimated_inventory')::integer, 0),
            COALESCE(product_record->'inventory_by_location', '{}'::jsonb),
            product_record->>'primary_category',
            product_record->>'secondary_category',
            COALESCE((product_record->>'is_active')::boolean, true),
            true, 
            false, 
            (product_record->>'inner_carton_qty')::bigint,
            (product_record->>'master_case_qty')::bigint,
            NOW()
        )
        ON CONFLICT (sku) DO UPDATE SET
            net_suite_id = EXCLUDED.net_suite_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            base_price = EXCLUDED.base_price,
            estimated_inventory = EXCLUDED.estimated_inventory,
            inventory_by_location = EXCLUDED.inventory_by_location,
            primary_category = EXCLUDED.primary_category,
            secondary_category = EXCLUDED.secondary_category,
            inner_carton_qty = EXCLUDED.inner_carton_qty,
            master_case_qty = EXCLUDED.master_case_qty,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
    END LOOP;
END;
$$;
