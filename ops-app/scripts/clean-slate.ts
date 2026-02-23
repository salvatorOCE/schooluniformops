/**
 * Clean slate: delete all WooCommerce-sourced data so we can sync from the real store.
 * Order respects foreign keys: order_items → orders → embroidery_batches → products → schools.
 * Run from ops-app: npx ts-node scripts/clean-slate.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanSlate() {
    console.log('Cleaning slate: removing all orders, order items, products, and schools...\n');

    const tables = [
        'order_items',
        'orders',
        'embroidery_batches',
        'products',
        'schools',
    ] as const;

    for (const name of tables) {
        const { error } = await supabase.from(name).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) {
            console.error(`Failed to delete ${name}:`, error.message);
            process.exit(1);
        }
        console.log(`  ✓ ${name}: cleared`);
    }

    console.log('\nClean slate complete. Next: add real WooCommerce credentials to .env.local, then run sync.');
}

cleanSlate().catch((err) => {
    console.error(err);
    process.exit(1);
});
