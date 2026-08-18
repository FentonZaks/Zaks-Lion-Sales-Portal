-- 20260724000007_sales_rep_filtering.sql

-- 1. Add NetSuite Sales Rep mapping to user profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS netsuite_salesrep_name TEXT;

-- 2. Drop the existing generic policy on customers
DROP POLICY IF EXISTS "Users can read customers in their territory" ON public.customers;

-- 3. Create the new strict RBAC policy
CREATE POLICY "Users can read their assigned customers or all if admin" ON public.customers
    FOR SELECT TO authenticated 
    USING (
        -- Reps can see their own accounts
        salesrep = (SELECT netsuite_salesrep_name FROM public.user_profiles WHERE id = auth.uid())
        OR 
        -- Admins and Managers can see all accounts
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            JOIN public.roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND r.name IN ('MANAGER', 'ADMIN')
        )
    );

-- 4. Grant Admins/Managers access to manage User Profiles
CREATE POLICY "Admins can manage user profiles" ON public.user_profiles
    FOR ALL TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            JOIN public.roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND r.name IN ('MANAGER', 'ADMIN')
        )
    );
