require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const { error } = await supabase.from('orders').update({ status: 'IN_PRODUCTION' }).eq('woo_order_id', 19370924);
    console.log(error);
}
test();
