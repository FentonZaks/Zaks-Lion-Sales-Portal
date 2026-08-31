import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gurkqbfgvpxtxhzgjriy.supabase.co';
const supabaseServiceKey = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'; // Service key needed for auth.admin

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedAdmin() {
  const email = 'bryan@zaksfoods.ca';
  const password = 'AdminPassword123!';
  
  console.log(`Creating user ${email}...`);
  
  // 1. Create or fetch the user
  let userId;
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true // bypass email confirmation
  });

  if (userError && userError.message.includes('already been registered')) {
    console.log('User already exists, fetching...');
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
    const user = users.users.find(u => u.email === email);
    userId = user.id;
  } else if (userError) {
    console.error('Error creating user:', userError.message);
    return;
  } else {
    userId = userData.user.id;
  }
  
  console.log('User ID:', userId);

  // 2. The database trigger automatically creates the user_profile.
  // 3. Create the ADMIN role if it doesn't exist
  await supabase.from('roles').upsert({ name: 'ADMIN', description: 'System Administrator' }, { onConflict: 'name' });

  // 4. Find the ADMIN role
  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'ADMIN')
    .single();
    
  if (rolesError) {
    console.error('Error finding ADMIN role:', rolesError.message);
    return;
  }
  
  // 4. Assign ADMIN role
  const { error: assignError } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role_id: roles.id
    });
    
  if (assignError) {
    console.error('Error assigning role:', assignError.message);
    return;
  }
  
  console.log(`Successfully created ${email} and assigned ADMIN role!`);
  console.log(`You can now log in with Password: ${password}`);
}

seedAdmin();
