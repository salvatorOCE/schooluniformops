import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveOrderUuid } from '@/lib/woo-utils';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

function getWooClient() {
    const url = process.env.WOO_URL;
    const consumerKey = process.env.WOO_CONSUMER_KEY;
    const consumerSecret = process.env.WOO_CONSUMER_SECRET;
    if (!url || !consumerKey || !consumerSecret) return null;
    return new WooCommerceRestApi({ url, consumerKey, consumerSecret, version: 'wc/v3' });
}

/** GET /api/woo/order-details?orderId=<supabase-order-uuid|order_number>
 * Fetches full WooCommerce order (billing, shipping, dates, payment, line items, etc.) for the given Supabase order id or order number.
 */
export async function GET(req: NextRequest) {
    const orderId = req.nextUrl.searchParams.get('orderId');
    if (!orderId) {
        return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const woo = getWooClient();
    if (!woo) {
        return NextResponse.json({ error: 'WooCommerce not configured' }, { status: 502 });
    }

    try {
        const orderUuid = await resolveOrderUuid(orderId);
        if (!orderUuid) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const { data: orderRow, error } = await supabaseAdmin
            .from('orders')
            .select('woo_order_id')
            .eq('id', orderUuid)
            .single();

        if (error || !orderRow?.woo_order_id) {
            return NextResponse.json({ error: 'Order not found or not linked to WooCommerce' }, { status: 404 });
        }

        const response = await woo.get(`orders/${orderRow.woo_order_id}`);
        const order = response.data;
        if (!order) {
            return NextResponse.json({ error: 'WooCommerce order not found' }, { status: 404 });
        }

        return NextResponse.json(order);
    } catch (err: any) {
        console.error('Order details fetch error:', err?.response?.data || err);
        return NextResponse.json(
            { error: err?.response?.data?.message || err?.message || 'Failed to fetch order details' },
            { status: 500 }
        );
    }
}
