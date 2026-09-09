-- Update the sync_product_data RPC to include price_store, price_canco, and price_distributor
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
            is_hidden, is_kit_only, inner_carton_qty, master_case_qty, is_archived, kit_components,
            price_store, price_canco, price_distributor, updated_at
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
            false, 
            COALESCE((product_record->>'is_kit_only')::boolean, false),
            (product_record->>'inner_carton_qty')::bigint,
            (product_record->>'master_case_qty')::bigint,
            COALESCE((product_record->>'is_archived')::boolean, false),
            COALESCE(product_record->'kit_components', '[]'::jsonb),
            (product_record->>'price_store')::numeric,
            (product_record->>'price_canco')::numeric,
            (product_record->>'price_distributor')::numeric,
            NOW()
        )
        ON CONFLICT ON CONSTRAINT products_net_suite_id_key DO UPDATE SET
            sku = EXCLUDED.sku,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            base_price = EXCLUDED.base_price,
            estimated_inventory = EXCLUDED.estimated_inventory,
            inventory_by_location = EXCLUDED.inventory_by_location,
            primary_category = EXCLUDED.primary_category,
            secondary_category = EXCLUDED.secondary_category,
            is_active = EXCLUDED.is_active,
            is_kit_only = EXCLUDED.is_kit_only,
            inner_carton_qty = EXCLUDED.inner_carton_qty,
            master_case_qty = EXCLUDED.master_case_qty,
            is_archived = EXCLUDED.is_archived,
            kit_components = EXCLUDED.kit_components,
            price_store = EXCLUDED.price_store,
            price_canco = EXCLUDED.price_canco,
            price_distributor = EXCLUDED.price_distributor,
            updated_at = NOW();
    END LOOP;
END;
$$;
