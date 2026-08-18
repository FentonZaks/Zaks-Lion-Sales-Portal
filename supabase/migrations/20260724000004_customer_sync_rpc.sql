-- Add salesrep column to customers
ALTER TABLE public.customers ADD COLUMN salesrep TEXT;

-- Create an RPC function to upsert a customer with their primary contact and locations
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
        INSERT INTO public.customers (net_suite_id, name, terms, balance, salesrep, updated_at)
        VALUES (
            v_net_suite_id,
            customer_record->>'name',
            customer_record->>'terms',
            COALESCE((customer_record->>'balance')::numeric, 0),
            customer_record->>'salesrep',
            NOW()
        )
        ON CONFLICT (net_suite_id) DO UPDATE SET
            name = EXCLUDED.name,
            terms = EXCLUDED.terms,
            balance = EXCLUDED.balance,
            salesrep = EXCLUDED.salesrep,
            updated_at = NOW()
        RETURNING id INTO v_customer_id;

        -- 2. Upsert Contact (using email or phone as an identifier, or just relying on customer_id + name)
        IF customer_record->'contact'->>'first_name' IS NOT NULL THEN
            -- Delete old contacts for this customer to keep it 1:1 simple for now (since we only pull primary)
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

        -- 3. Upsert Location (Billing)
        IF customer_record->'location'->>'address_line_1' IS NOT NULL THEN
            -- Delete old locations to keep it simple 1:1
            DELETE FROM public.customer_locations WHERE customer_id = v_customer_id;

            INSERT INTO public.customer_locations (customer_id, address_line_1, city, province, postal_code, is_default_shipping)
            VALUES (
                v_customer_id,
                customer_record->'location'->>'address_line_1',
                customer_record->'location'->>'city',
                customer_record->'location'->>'province',
                customer_record->'location'->>'postal_code',
                true
            );
        END IF;

    END LOOP;
END;
$$;
