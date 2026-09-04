-- Migration: Add submitted_by column to pending_customers
ALTER TABLE public.pending_customers ADD COLUMN submitted_by UUID REFERENCES auth.users(id);
