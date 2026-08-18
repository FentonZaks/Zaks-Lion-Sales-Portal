
-- Add new columns for categorisation and geographic restriction
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS primary_category TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS secondary_category TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS allowed_provinces TEXT[] DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS allowed_countries TEXT[] DEFAULT NULL;

-- Update the RPC function to handle categories
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
        INSERT INTO public.products (net_suite_id, sku, name, description, base_price, estimated_inventory, inventory_by_location, primary_category, secondary_category, updated_at)
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
            updated_at = NOW();
    END LOOP;
END;
$$;
