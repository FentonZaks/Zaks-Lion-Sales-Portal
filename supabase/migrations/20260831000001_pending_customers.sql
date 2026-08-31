-- Migration: Create pending_customers table for CRM
CREATE TABLE IF NOT EXISTS public.pending_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    legal_name TEXT,
    shipping_address TEXT,
    shipping_city TEXT,
    shipping_postal_code TEXT,
    shipping_country TEXT,
    banner TEXT,
    channel TEXT,
    price_level TEXT,
    sales_rep TEXT,
    primary_first_name TEXT,
    primary_last_name TEXT,
    primary_email TEXT,
    primary_phone TEXT,
    ap_name TEXT,
    ap_email TEXT,
    ap_phone TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pending_customers ENABLE ROW LEVEL SECURITY;

-- Only Admins can see pending customers
CREATE POLICY "Admins can read pending customers" ON public.pending_customers
    FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            JOIN public.roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND r.name = 'ADMIN'
        )
    );

-- Only Admins can insert pending customers
CREATE POLICY "Admins can insert pending customers" ON public.pending_customers
    FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            JOIN public.roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND r.name = 'ADMIN'
        )
    );

-- Only Admins can update pending customers
CREATE POLICY "Admins can update pending customers" ON public.pending_customers
    FOR UPDATE TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            JOIN public.roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND r.name = 'ADMIN'
        )
    );
