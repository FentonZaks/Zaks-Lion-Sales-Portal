-- Migration: Allow all authenticated users to insert pending customers (not just admins)
DROP POLICY IF EXISTS "Admins can insert pending customers" ON public.pending_customers;

CREATE POLICY "Authenticated users can insert pending customers" ON public.pending_customers
    FOR INSERT TO authenticated 
    WITH CHECK (true);
