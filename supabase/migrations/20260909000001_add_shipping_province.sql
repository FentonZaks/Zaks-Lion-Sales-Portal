-- Migration: Add shipping_province to pending_customers
ALTER TABLE public.pending_customers ADD COLUMN shipping_province TEXT;
