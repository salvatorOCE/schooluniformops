
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fix() {
    console.log('Checking Order Statuses...');

    // Check distribution
    const { data: orders } = await supabase.from('orders').select('status');
    const counts: Record<string, number> = {};
    orders?.forEach(o => {
        counts[o.status] = (counts[o.status] || 0) + 1;
    });
    console.log('Current Statuses:', counts);

    // Update 'AWAITING_EMBROIDERY' and 'IMPORTED' to 'AWAITING_PACK'
    // This allows them to show up in the Packing View
    const { error } = await supabase
        .from('orders')
        .update({ status: 'AWAITING_PACK' })
        .in('status', ['AWAITING_EMBROIDERY', 'IMPORTED']);

    if (error) console.error('Update failed:', error);
    else console.log('Updated open orders to AWAITING_PACK');

    // Re-check
    const { data: newOrders } = await supabase.from('orders').select('status');
    const newCounts: Record<string, number> = {};
    newOrders?.forEach(o => {
        newCounts[o.status] = (newCounts[o.status] || 0) + 1;
    });
    console.log('New Statuses:', newCounts);
}

fix();
