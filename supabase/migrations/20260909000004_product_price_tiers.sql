-- Add specialized pricing tiers to products table to support customer-specific pricing out of the box
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS price_canco DECIMAL(15,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS price_distributor DECIMAL(15,2) DEFAULT NULL;

-- Note: base_price is inherently treated as the "Store" price going forward.
