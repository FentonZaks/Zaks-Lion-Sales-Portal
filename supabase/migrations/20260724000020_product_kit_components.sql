
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS kit_components JSONB DEFAULT '[]'::jsonb;

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
            net_suite_id, sku, name, description, base_price, 
            primary_category, secondary_category, is_active, 
            inner_carton_qty, master_case_qty, estimated_inventory, 
            inventory_by_location, kit_components,
            updated_at
        )
        VALUES (
            (product_record->>'net_suite_id')::bigint,
            product_record->>'sku',
            product_record->>'name',
            product_record->>'description',
            (product_record->>'base_price')::numeric,
            product_record->>'primary_category',
            product_record->>'secondary_category',
            (product_record->>'is_active')::boolean,
            (product_record->>'inner_carton_qty')::bigint,
            (product_record->>'master_case_qty')::bigint,
            (product_record->>'estimated_inventory')::bigint,
            product_record->'inventory_by_location',
            product_record->'kit_components',
            NOW()
        )
        ON CONFLICT (net_suite_id) DO UPDATE SET
            sku = EXCLUDED.sku,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            base_price = EXCLUDED.base_price,
            primary_category = EXCLUDED.primary_category,
            secondary_category = EXCLUDED.secondary_category,
            is_active = EXCLUDED.is_active,
            inner_carton_qty = EXCLUDED.inner_carton_qty,
            master_case_qty = EXCLUDED.master_case_qty,
            estimated_inventory = EXCLUDED.estimated_inventory,
            inventory_by_location = EXCLUDED.inventory_by_location,
            kit_components = EXCLUDED.kit_components,
            updated_at = EXCLUDED.updated_at;
    END LOOP;
END;
$$;
