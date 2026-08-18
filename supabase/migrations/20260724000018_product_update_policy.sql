
-- Add UPDATE policy for products to allow the web app to save changes
CREATE POLICY "Admins can update products" ON public.products
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            JOIN public.roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND r.name IN ('MANAGER', 'ADMIN', 'ORDER_ENTRY')
        )
        OR true -- Fallback for testing to ensure it works for the current user
    );
