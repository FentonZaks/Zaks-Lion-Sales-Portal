import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Paste your new 'sb_secret_...' key here!
const SUPABASE_SERVICE_KEY = 'YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE';
const SUPABASE_URL = 'https://gurkqbfgvpxtxhzgjriy.supabase.co';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function resetPassword() {
    console.log("Looking up Bryan's account...");
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
        console.error("Error fetching users:", listError.message);
        return;
    }

    const bryan = users.users.find(u => u.email === 'bryan@zaksfoods.ca');
    if (!bryan) {
        console.error("Could not find bryan@zaksfoods.ca");
        return;
    }

    console.log("Found Bryan! Forcing password reset...");
    
    // Set the new password directly (bypassing email)
    const { error: updateError } = await supabase.auth.admin.updateUserById(bryan.id, {
        password: 'NewPassword123!'
    });

    if (updateError) {
        console.error("Error updating password:", updateError.message);
    } else {
        console.log("Success! Your password is now: NewPassword123!");
        console.log("You can log in now and then use the Forgot Password later to change it when the rate limit expires.");
    }
}

resetPassword();
