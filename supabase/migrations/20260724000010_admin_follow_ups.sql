
-- Drop the existing overly restrictive policies
DROP POLICY IF EXISTS "Users can insert follow ups" ON public.follow_ups;
DROP POLICY IF EXISTS "Users can update their assigned follow ups" ON public.follow_ups;

-- Recreate policies to allow Admins/Managers to insert/update ANY follow up, while normal users can only insert/update their own
CREATE POLICY "Users can insert follow ups" ON public.follow_ups
    FOR INSERT TO authenticated 
    WITH CHECK (
        auth.uid() = assigned_to 
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur 
            JOIN public.roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND r.name IN ('MANAGER', 'ADMIN')
        )
    );

CREATE POLICY "Users can update follow ups" ON public.follow_ups
    FOR UPDATE TO authenticated 
    USING (
        auth.uid() = assigned_to 
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur 
            JOIN public.roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND r.name IN ('MANAGER', 'ADMIN')
        )
    );
