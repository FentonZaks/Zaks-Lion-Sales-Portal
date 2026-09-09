import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUnassigned() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const isoStart = startOfMonth.toISOString();

    const { data: activities } = await supabase
        .from('activities')
        .select('id, user_id, customer_id, activity_type, subject, notes, activity_date')
        .gte('activity_date', isoStart);

    if (!activities) {
        console.log("No activities found");
        return;
    }

    const { data: customers } = await supabase
        .from('customers')
        .select('id, internal_id, company_name, salesrep');

    const customerMap = {};
    customers?.forEach(c => customerMap[c.id] = c);

    console.log("Looking for unassigned activities...");
    for (const a of activities) {
        const cust = customerMap[a.customer_id];
        if (!cust || !cust.salesrep) {
            console.log("-----------------------------------------");
            console.log(`Activity ID: ${a.id}`);
            console.log(`Type: ${a.activity_type}, Subject: ${a.subject}`);
            console.log(`Customer ID mapped: ${a.customer_id}`);
            if (cust) {
                console.log(`Customer Name: ${cust.company_name}`);
                console.log(`Customer Sales Rep: ${cust.salesrep === null ? 'NULL' : cust.salesrep}`);
            } else {
                console.log(`CUSTOMER NOT FOUND IN DB (Or id mismatch)`);
            }
        }
    }
}

checkUnassigned();
