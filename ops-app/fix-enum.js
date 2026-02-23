require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
    // Add IN_PRODUCTION to the order_status enum
    const { data, error } = await supabase.rpc('exec_sql', {
        sql: "ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'IN_PRODUCTION';"
    });
    
    if (error) {
        console.log("RPC error (trying direct):", error.message);
        // Try via raw SQL if RPC doesn't exist
        const { error: err2 } = await supabase.from('_temp').select().limit(0);
        console.log("Fallback needed - must run ALTER TYPE manually in Supabase SQL Editor");
    } else {
        console.log("SUCCESS: Added IN_PRODUCTION to order_status enum");
    }
}
fix();
