require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    // First check current status
    const { data: before } = await supabase.from('orders').select('status').eq('woo_order_id', 19370922).single();
    console.log("Current DB status:", before?.status);

    // Try to set it to IN_PRODUCTION
    const { data, error } = await supabase.from('orders').update({ status: 'IN_PRODUCTION' }).eq('woo_order_id', 19370922).select().single();
    if (error) {
        console.log("ERROR:", error);
    } else {
        console.log("Updated to:", data.status);
    }
}
test();
