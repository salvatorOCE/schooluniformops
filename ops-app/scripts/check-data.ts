
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    console.log('Checking database counts...');

    // Check Schools
    const { count: schools, error: sErr } = await supabase.from('schools').select('*', { count: 'exact', head: true });
    if (sErr) console.error('Schools error:', sErr.message);
    else console.log(`Schools: ${schools}`);

    // Check Products
    const { count: products, error: pErr } = await supabase.from('products').select('*', { count: 'exact', head: true });
    if (pErr) console.error('Products error:', pErr.message);
    else console.log(`Products: ${products}`);

    // Check Orders
    const { count: orders, error: oErr } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    if (oErr) console.error('Orders error:', oErr.message);
    else console.log(`Orders: ${orders}`);

    // Check RLS status (by trying to read with ANON key)
    const anonClient = createClient(SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { count: anonOrders, error: aErr } = await anonClient.from('orders').select('*', { count: 'exact', head: true });
    if (aErr) console.error('Anon Orders error:', aErr.message);
    else console.log(`Orders visible to Anon: ${anonOrders}`);
}

check();
