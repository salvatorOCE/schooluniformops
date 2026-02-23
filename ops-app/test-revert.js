require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async()=>{
    // Revert the test order back to DISPATCHED (it's 'shipped' in Woo)
    await s.from('orders').update({ status: 'DISPATCHED' }).eq('woo_order_id', 19370924);
    console.log("Reverted SUS-0191 back to DISPATCHED");
})();
