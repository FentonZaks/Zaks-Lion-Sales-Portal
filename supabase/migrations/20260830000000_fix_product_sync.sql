-- 1. Ensure all latest columns exist on the products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS inventory_by_location JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS primary_category TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS secondary_category TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS allowed_provinces TEXT[] DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS allowed_countries TEXT[] DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_kit_only BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS inner_carton_qty INTEGER DEFAULT null;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS master_case_qty INTEGER DEFAULT null;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS kit_components JSONB DEFAULT '[]'::jsonb;

-- 2. Update the sync_product_data RPC to correctly handle NetSuite ID conflicts
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
            is_hidden, is_kit_only, inner_carton_qty, master_case_qty, is_archived, kit_components, updated_at
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
            (product_record->>'inner_carton_qty')::integer,
            (product_record->>'master_case_qty')::integer,
            COALESCE((product_record->>'is_archived')::boolean, false),
            COALESCE(product_record->'kit_components', '[]'::jsonb),
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
            updated_at = NOW();
    END LOOP;
END;
$$;
