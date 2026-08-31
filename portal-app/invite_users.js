import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gurkqbfgvpxtxhzgjriy.supabase.co';
const supabaseServiceKey = 'YOUR_SUPABASE_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inviteUsers() {
    console.log('Authorizing emails...');
    await supabase.from('authorized_emails').upsert([
        { email: 'jarvis@zaksfoods.ca', is_active: true },
        { email: 'rickie@zaksfoods.ca', is_active: true }
    ], { onConflict: 'email' });

    // Ensure MANAGER role exists
    await supabase.from('roles').upsert({ name: 'MANAGER', description: 'Sales Manager (Sees All)' }, { onConflict: 'name' });
    const { data: managerRole } = await supabase.from('roles').select('id').eq('name', 'MANAGER').single();

    console.log('Inviting Jarvis...');
    const { data: jarvisData, error: jarvisError } = await supabase.auth.admin.inviteUserByEmail('jarvis@zaksfoods.ca');
    
    let jarvisId;
    if (jarvisError && jarvisError.message.includes('already been registered')) {
        console.log('Jarvis already exists, fetching...');
        const { data: users } = await supabase.auth.admin.listUsers();
        jarvisId = users.users.find(u => u.email === 'jarvis@zaksfoods.ca').id;
    } else if (jarvisError) {
        console.error('Error inviting Jarvis:', jarvisError.message);
    } else {
        jarvisId = jarvisData.user.id;
    }

    if (jarvisId) {
        // Update first name
        await supabase.from('user_profiles').update({ first_name: 'Jarvis' }).eq('id', jarvisId);
        
        // Assign MANAGER role
        const { error: roleErr } = await supabase.from('user_roles').insert({ user_id: jarvisId, role_id: managerRole.id });
        if (roleErr && !roleErr.message.includes('duplicate key')) console.error(roleErr);
        console.log('Jarvis successfully invited and assigned MANAGER role (Sees All).');
    }

    console.log('Inviting Rickie...');
    const { data: rickieData, error: rickieError } = await supabase.auth.admin.inviteUserByEmail('rickie@zaksfoods.ca');
    
    let rickieId;
    if (rickieError && rickieError.message.includes('already been registered')) {
        console.log('Rickie already exists, fetching...');
        const { data: users } = await supabase.auth.admin.listUsers();
        rickieId = users.users.find(u => u.email === 'rickie@zaksfoods.ca').id;
    } else if (rickieError) {
        console.error('Error inviting Rickie:', rickieError.message);
    } else {
        rickieId = rickieData.user.id;
    }

    if (rickieId) {
        // Update first name and restrict to Rickie Hollait in NetSuite
        await supabase.from('user_profiles').update({ 
            first_name: 'Rickie',
            netsuite_salesrep_name: 'Rickie Hollait'
        }).eq('id', rickieId);
        
        console.log('Rickie successfully invited and restricted to NetSuite Sales Rep "Rickie Hollait".');
    }
    
    console.log('Done!');
}

inviteUsers();
