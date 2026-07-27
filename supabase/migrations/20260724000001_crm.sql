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
