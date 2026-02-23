const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    const { data, error } = await supabase
        .from('orders')
        .select('id, woo_order_id, order_number, status')
        .ilike('order_number', '%192%');
    console.log('QueryResult for 192:', data);

    const { data: data2 } = await supabase
        .from('orders')
        .select('id, woo_order_id, order_number, status')
        .ilike('order_number', '%193%');
    console.log('QueryResult for 193:', data2);
}
run();
