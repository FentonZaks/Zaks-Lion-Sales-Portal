
-- Add inventory_by_location JSONB column
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS inventory_by_location JSONB DEFAULT '{}'::jsonb;

-- Create an RPC function to upsert products
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
        INSERT INTO public.products (net_suite_id, sku, name, description, base_price, estimated_inventory, inventory_by_location, updated_at)
        VALUES (
            product_record->>'net_suite_id',
            product_record->>'sku',
            product_record->>'name',
            COALESCE(product_record->>'description', ''),
            COALESCE((product_record->>'base_price')::numeric, 0.00),
            COALESCE((product_record->>'estimated_inventory')::integer, 0),
            COALESCE(product_record->'inventory_by_location', '{}'::jsonb),
            NOW()
        )
        ON CONFLICT (sku) DO UPDATE SET
            net_suite_id = EXCLUDED.net_suite_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            base_price = EXCLUDED.base_price,
            estimated_inventory = EXCLUDED.estimated_inventory,
            inventory_by_location = EXCLUDED.inventory_by_location,
            updated_at = NOW();
    END LOOP;
END;
$$;
