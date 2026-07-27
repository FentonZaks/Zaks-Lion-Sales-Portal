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
