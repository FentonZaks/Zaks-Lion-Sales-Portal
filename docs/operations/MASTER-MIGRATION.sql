-- === 20260724000000_foundation.sql ===
-- 00001_foundation.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Authorized Emails (The explicit whitelist)
CREATE TABLE public.authorized_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Profiles
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Roles and User Roles
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE public.user_roles (
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 4. Territories and User Territories
CREATE TABLE public.territories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    region TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_territories (
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    territory_id UUID REFERENCES public.territories(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, territory_id)
);

-- 5. Audit Events
CREATE TABLE public.audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Foundation
ALTER TABLE public.authorized_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Sales Reps read their own profile, Admins read all)
CREATE POLICY "Users can read own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can read their roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read their territories" ON public.user_territories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read roles" ON public.roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can read territories" ON public.territories
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert audit events" ON public.audit_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Secure Trigger to check Authorized Emails on User Signup
CREATE OR REPLACE FUNCTION public.check_authorized_email()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.authorized_emails
        WHERE email = NEW.email AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Email address is not authorized for access.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_check_email
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.check_authorized_email();

-- Trigger to create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ language plpgsql security definer;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- === 20260724000001_crm.sql ===
-- 00002_crm.sql

-- 1. Customers
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    net_suite_id TEXT UNIQUE,
    name TEXT NOT NULL,
    terms TEXT,
    balance DECIMAL(15,2) DEFAULT 0.00,
    territory_id UUID REFERENCES public.territories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Customer Locations
CREATE TABLE public.customer_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    address_line_1 TEXT,
    address_line_2 TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    country TEXT,
    is_default_shipping BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Customer Contacts
CREATE TABLE public.customer_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    title TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Activities (Visits, Phone Calls, General Notes)
CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('VISIT', 'CALL', 'NOTE')),
    contact_id UUID REFERENCES public.customer_contacts(id),
    activity_date TIMESTAMPTZ DEFAULT NOW(),
    subject TEXT,
    notes TEXT,
    -- Visit specific
    visit_purpose TEXT,
    merchandising_condition TEXT,
    display_condition TEXT,
    competitor_observation TEXT,
    -- Call specific
    call_outcome TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Attachments
CREATE TABLE public.attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Follow-ups
CREATE TABLE public.follow_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.user_profiles(id),
    related_activity_id UUID REFERENCES public.activities(id),
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    completion_note TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Enforcement
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- Customer Policies (Reps see customers in their territories)
CREATE POLICY "Users can read customers in their territory" ON public.customers
    FOR SELECT TO authenticated 
    USING (
        territory_id IN (
            SELECT territory_id FROM public.user_territories WHERE user_id = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            JOIN public.roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND r.name IN ('MANAGER', 'ADMIN')
        )
    );

CREATE POLICY "Users can read locations of their customers" ON public.customer_locations
    FOR SELECT TO authenticated 
    USING (
        customer_id IN (
            SELECT id FROM public.customers
        )
    );

CREATE POLICY "Users can read contacts of their customers" ON public.customer_contacts
    FOR SELECT TO authenticated 
    USING (
        customer_id IN (
            SELECT id FROM public.customers
        )
    );

-- Activities Policies (Reps see activities for their customers, can only insert their own)
CREATE POLICY "Users can read activities for their customers" ON public.activities
    FOR SELECT TO authenticated 
    USING (
        customer_id IN (
            SELECT id FROM public.customers
        )
    );

CREATE POLICY "Users can insert their own activities" ON public.activities
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities" ON public.activities
    FOR UPDATE TO authenticated 
    USING (auth.uid() = user_id);

-- Follow-ups Policies
CREATE POLICY "Users can read follow ups for their customers" ON public.follow_ups
    FOR SELECT TO authenticated 
    USING (
        customer_id IN (
            SELECT id FROM public.customers
        )
    );

CREATE POLICY "Users can insert follow ups" ON public.follow_ups
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = assigned_to);

CREATE POLICY "Users can update their assigned follow ups" ON public.follow_ups
    FOR UPDATE TO authenticated 
    USING (auth.uid() = assigned_to);


-- === 20260724000002_orders.sql ===
-- 00003_orders.sql

-- 1. Products (Master Catalog)
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    net_suite_id TEXT UNIQUE,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    base_price DECIMAL(15,2) NOT NULL,
    is_kit BOOLEAN DEFAULT false,
    estimated_inventory INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Item Groups (Kits mapping)
CREATE TABLE public.item_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kit_product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    component_product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1,
    UNIQUE(kit_product_id, component_product_id)
);

-- 3. Product Prices (Customer specific or general levels)
CREATE TABLE public.product_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    price DECIMAL(15,2) NOT NULL,
    UNIQUE(product_id, customer_id)
);

-- 4. Orders
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portal_order_id TEXT UNIQUE,
    customer_id UUID REFERENCES public.customers(id) NOT NULL,
    user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'EXPORTED')),
    subtotal DECIMAL(15,2) DEFAULT 0.00,
    net_suite_so_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Order Lines
CREATE TABLE public.order_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    is_price_overridden BOOLEAN DEFAULT false,
    override_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Enforcement
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_lines ENABLE ROW LEVEL SECURITY;

-- Product Policies (Everyone authenticated can read catalog)
CREATE POLICY "Users can read products" ON public.products
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can read item groups" ON public.item_groups
    FOR SELECT TO authenticated USING (true);

-- Product Prices Policies (Users can read prices for their customers)
CREATE POLICY "Users can read prices for their customers" ON public.product_prices
    FOR SELECT TO authenticated 
    USING (
        customer_id IN (
            SELECT territory_id FROM public.user_territories WHERE user_id = auth.uid()
        )
    );

-- Orders Policies (Reps can read/write their own orders)
CREATE POLICY "Users can read their own orders" ON public.orders
    FOR SELECT TO authenticated 
    USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.user_roles ur 
        JOIN public.roles r ON ur.role_id = r.id 
        WHERE ur.user_id = auth.uid() AND r.name IN ('MANAGER', 'ADMIN', 'ORDER_ENTRY')
    ));

CREATE POLICY "Users can insert their own orders" ON public.orders
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON public.orders
    FOR UPDATE TO authenticated 
    USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.user_roles ur 
        JOIN public.roles r ON ur.role_id = r.id 
        WHERE ur.user_id = auth.uid() AND r.name IN ('MANAGER', 'ADMIN', 'ORDER_ENTRY')
    ));

-- Order Lines Policies
CREATE POLICY "Users can read lines for visible orders" ON public.order_lines
    FOR SELECT TO authenticated 
    USING (
        order_id IN (SELECT id FROM public.orders)
    );

CREATE POLICY "Users can insert lines for their orders" ON public.order_lines
    FOR INSERT TO authenticated 
    WITH CHECK (
        order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update lines for their orders" ON public.order_lines
    FOR UPDATE TO authenticated 
    USING (
        order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    );


-- === 20260724000003_reporting.sql ===
-- 00004_reporting.sql

-- 1. Sales Performance View
CREATE OR REPLACE VIEW public.vw_sales_performance WITH (security_invoker = true) AS
SELECT 
    DATE_TRUNC('month', o.created_at) as month,
    u.id as rep_id,
    u.first_name || ' ' || u.last_name as rep_name,
    COUNT(o.id) as total_orders,
    SUM(o.subtotal) as total_sales_value
FROM public.orders o
JOIN public.user_profiles u ON o.user_id = u.id
WHERE o.status != 'DRAFT'
GROUP BY DATE_TRUNC('month', o.created_at), u.id, u.first_name, u.last_name;

-- 2. Activity Metrics View
CREATE OR REPLACE VIEW public.vw_activity_metrics WITH (security_invoker = true) AS
SELECT 
    DATE_TRUNC('week', a.activity_date) as week,
    u.id as rep_id,
    u.first_name || ' ' || u.last_name as rep_name,
    a.activity_type,
    COUNT(a.id) as activity_count
FROM public.activities a
JOIN public.user_profiles u ON a.user_id = u.id
GROUP BY DATE_TRUNC('week', a.activity_date), u.id, u.first_name, u.last_name, a.activity_type;

-- Note on Security:
-- By using 'security_invoker = true', these views will automatically respect the RLS policies 
-- of their underlying tables (orders, activities) based on the user running the query.


