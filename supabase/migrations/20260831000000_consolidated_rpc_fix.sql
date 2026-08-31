-- Consolidates all fields into the master sync_customer_data RPC
-- Includes: core fields, invoice data, revenue metrics, category dates, and location country

DROP FUNCTION IF EXISTS sync_customer_data(JSONB);

CREATE OR REPLACE FUNCTION sync_customer_data(payload JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    customer_record JSONB;
    v_customer_id UUID;
    v_net_suite_id TEXT;
BEGIN
    FOR customer_record IN SELECT * FROM jsonb_array_elements(payload)
    LOOP
        v_net_suite_id := customer_record->>'net_suite_id';

        -- 1. Upsert Customer
        INSERT INTO public.customers (
            net_suite_id, name, terms, balance, salesrep, 
            subsidiary, currency, banner, route, route_day, channel, 
            price_level, date_created, date_of_last_sale, 
            last_invoice_date, last_invoice_amount, last_invoice_number,
            mtd_revenue, ytd_revenue, last_month_revenue, category_last_invoice_dates, updated_at
        )
        VALUES (
            v_net_suite_id,
            customer_record->>'name',
            customer_record->>'terms',
            COALESCE((customer_record->>'balance')::numeric, 0),
            customer_record->>'salesrep',
            customer_record->>'subsidiary',
            customer_record->>'currency',
            customer_record->>'banner',
            customer_record->>'route',
            customer_record->>'route_day',
            customer_record->>'channel',
            customer_record->>'price_level',
            (customer_record->>'date_created')::TIMESTAMPTZ,
            (customer_record->>'date_of_last_sale')::TIMESTAMPTZ,
            (customer_record->>'last_invoice_date')::TIMESTAMPTZ,
            (customer_record->>'last_invoice_amount')::NUMERIC,
            customer_record->>'last_invoice_number',
            (customer_record->>'mtd_revenue')::NUMERIC,
            (customer_record->>'ytd_revenue')::NUMERIC,
            (customer_record->>'last_month_revenue')::NUMERIC,
            COALESCE(customer_record->'category_last_invoice_dates', '{}'::jsonb),
            NOW()
        )
        ON CONFLICT (net_suite_id) DO UPDATE SET
            name = EXCLUDED.name,
            terms = EXCLUDED.terms,
            balance = EXCLUDED.balance,
            salesrep = EXCLUDED.salesrep,
            subsidiary = EXCLUDED.subsidiary,
            currency = EXCLUDED.currency,
            banner = EXCLUDED.banner,
            route = EXCLUDED.route,
            route_day = EXCLUDED.route_day,
            channel = EXCLUDED.channel,
            price_level = EXCLUDED.price_level,
            date_created = EXCLUDED.date_created,
            date_of_last_sale = EXCLUDED.date_of_last_sale,
            last_invoice_date = EXCLUDED.last_invoice_date,
            last_invoice_amount = EXCLUDED.last_invoice_amount,
            last_invoice_number = EXCLUDED.last_invoice_number,
            mtd_revenue = EXCLUDED.mtd_revenue,
            ytd_revenue = EXCLUDED.ytd_revenue,
            last_month_revenue = EXCLUDED.last_month_revenue,
            category_last_invoice_dates = EXCLUDED.category_last_invoice_dates,
            updated_at = NOW()
        RETURNING id INTO v_customer_id;

        -- 2. Upsert Contact (Primary only for now)
        IF customer_record->'contact'->>'first_name' IS NOT NULL THEN
            DELETE FROM public.customer_contacts WHERE customer_id = v_customer_id;
            
            INSERT INTO public.customer_contacts (customer_id, first_name, last_name, email, phone)
            VALUES (
                v_customer_id,
                customer_record->'contact'->>'first_name',
                COALESCE(customer_record->'contact'->>'last_name', ''),
                customer_record->'contact'->>'email',
                customer_record->'contact'->>'phone'
            );
        END IF;

        -- 3. Upsert Locations
        DELETE FROM public.customer_locations WHERE customer_id = v_customer_id;

        -- Billing Address
        IF customer_record->'billing_address'->>'address_line_1' IS NOT NULL THEN
            INSERT INTO public.customer_locations (
                customer_id, address_line_1, city, province, postal_code, country, is_default_shipping
            ) VALUES (
                v_customer_id,
                customer_record->'billing_address'->>'address_line_1',
                customer_record->'billing_address'->>'city',
                customer_record->'billing_address'->>'province',
                customer_record->'billing_address'->>'postal_code',
                customer_record->'billing_address'->>'country',
                false
            );
        END IF;

        -- Shipping Address
        IF customer_record->'shipping_address'->>'address_line_1' IS NOT NULL THEN
            INSERT INTO public.customer_locations (
                customer_id, address_line_1, city, province, postal_code, country, is_default_shipping
            ) VALUES (
                v_customer_id,
                customer_record->'shipping_address'->>'address_line_1',
                customer_record->'shipping_address'->>'city',
                customer_record->'shipping_address'->>'province',
                customer_record->'shipping_address'->>'postal_code',
                customer_record->'shipping_address'->>'country',
                true
            );
        END IF;

    END LOOP;
END;
$$;
