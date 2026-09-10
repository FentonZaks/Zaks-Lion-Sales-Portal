-- Add po_number and internal_memo to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS po_number text,
ADD COLUMN IF NOT EXISTS internal_memo text;
