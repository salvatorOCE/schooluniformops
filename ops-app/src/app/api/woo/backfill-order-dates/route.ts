import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromCookie } from '@/lib/session-server';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

/**
 * POST /api/woo/backfill-order-dates
 * Fetches ALL orders from WooCommerce and updates only created_at and paid_at in our DB.
 * Use this to fix the Orders list column so it shows real "order placed" dates (e.g. Feb 17 21:51)
 * instead of migration/updated dates (e.g. Feb 23).
 */
function getWooClient() {
    const url = process.env.WOO_URL;
    const consumerKey = process.env.WOO_CONSUMER_KEY;
    const consumerSecret = process.env.WOO_CONSUMER_SECRET;
    if (!url || !consumerKey || !consumerSecret) return null;
    return new WooCommerceRestApi({ url, consumerKey, consumerSecret, version: 'wc/v3' });
}

export async function POST() {
    const session = await getSessionFromCookie();
    if (!session) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const woo = getWooClient();
    if (!woo) {
        return NextResponse.json({ error: 'WooCommerce not configured' }, { status: 500 });
    }

    try {
        const allOrders: any[] = [];
        let page = 1;
        while (true) {
            const response = await woo.get('orders', {
                per_page: 100,
                page,
                order: 'asc',
            });
            if (!response.data?.length) break;
            allOrders.push(...response.data);
            page++;
        }

        let updated = 0;
        for (const order of allOrders) {
            const created = order.date_created_gmt || order.date_created || null;
            const paid = order.date_paid_gmt || order.date_paid || null;
            const updates: Record<string, string> = {};
            if (created) updates.created_at = created;
            if (paid) updates.paid_at = paid;
            if (Object.keys(updates).length === 0) continue;

            const { error } = await supabaseAdmin
                .from('orders')
                .update(updates)
                .eq('woo_order_id', order.id);

            if (!error) updated++;
        }

        return NextResponse.json({ success: true, updated, total: allOrders.length });
    } catch (err: any) {
        console.error('Backfill order dates error:', err?.response?.data || err);
        return NextResponse.json(
            { error: err?.response?.data?.message || err?.message || 'Backfill failed' },
            { status: 500 }
        );
    }
}
