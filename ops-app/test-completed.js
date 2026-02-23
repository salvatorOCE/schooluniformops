require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async()=>{
    const { error } = await s.from('orders').update({ status: 'COMPLETED' }).eq('woo_order_id', 19370924).select().single();
    console.log(error ? "REJECTED: " + error.message : "ACCEPTED");
})();
