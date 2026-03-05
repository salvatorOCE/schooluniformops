import { NextRequest, NextResponse } from 'next/server';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

function getWooClient() {
    const url = process.env.WOO_URL;
    const consumerKey = process.env.WOO_CONSUMER_KEY;
    const consumerSecret = process.env.WOO_CONSUMER_SECRET;
    if (!url || !consumerKey || !consumerSecret) return null;
    return new WooCommerceRestApi({ url, consumerKey, consumerSecret, version: 'wc/v3' });
}

/** GET /api/woo/recover-partial-orders
 * Lists WooCommerce orders with status partial-complete or partial-order-complete (often hidden if slug was too long).
 * Use the returned IDs with POST to move them back to "processing" so they show in the list.
 */
export async function GET() {
    const woo = getWooClient();
    if (!woo) {
        return NextResponse.json({ error: 'WooCommerce not configured' }, { status: 502 });
    }
    try {
        const res = await woo.get('orders', { status: 'partial-complete', per_page: 50 });
        const orders = (res.data as any[])?.map((o: any) => ({
            id: o.id,
            number: o.number,
            status: o.status,
            date_created: o.date_created,
        })) ?? [];
        return NextResponse.json({ orders });
    } catch (err: any) {
        console.error('Recover partial orders list error:', err?.response?.data ?? err.message);
        return NextResponse.json(
            { error: err?.response?.data?.message ?? err?.message ?? 'Failed to list orders' },
            { status: 500 }
        );
    }
}

/** POST /api/woo/recover-partial-orders
 * Body: { wooOrderId: number, newStatus?: string }
 * Moves one WooCommerce order to a standard status (default "processing") so it appears in the admin list.
 */
export async function POST(req: NextRequest) {
    const woo = getWooClient();
    if (!woo) {
        return NextResponse.json({ error: 'WooCommerce not configured' }, { status: 502 });
    }
    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const wooOrderId = body.wooOrderId;
    const newStatus = body.newStatus ?? 'processing';
    if (!wooOrderId) {
        return NextResponse.json({ error: 'wooOrderId required' }, { status: 400 });
    }
    try {
        await woo.put(`orders/${wooOrderId}`, { status: newStatus });
        return NextResponse.json({ success: true, wooOrderId, newStatus });
    } catch (err: any) {
        console.error('Recover partial order update error:', err?.response?.data ?? err.message);
        return NextResponse.json(
            { error: err?.response?.data?.message ?? err?.message ?? 'Failed to update order' },
            { status: 500 }
        );
    }
}
