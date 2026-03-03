import { NextResponse } from 'next/server';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

/**
 * GET /api/woo/test
 * Verifies WooCommerce REST API connection and returns a preview of recent orders
 * so you can confirm the API is returning data and see how order numbers are structured.
 */
function getWooClient() {
    const url = process.env.WOO_URL;
    const consumerKey = process.env.WOO_CONSUMER_KEY;
    const consumerSecret = process.env.WOO_CONSUMER_SECRET;
    if (!url || !consumerKey || !consumerSecret) return null;
    return new WooCommerceRestApi({ url, consumerKey, consumerSecret, version: 'wc/v3' });
}

export async function GET() {
    const woo = getWooClient();
    if (!woo) {
        return NextResponse.json({
            ok: false,
            error: 'WooCommerce not configured',
            hint: 'Set WOO_URL, WOO_CONSUMER_KEY, WOO_CONSUMER_SECRET in .env.local'
        }, { status: 500 });
    }

    try {
        const response = await woo.get('orders', {
            per_page: 10,
            page: 1,
            order: 'desc',
            orderby: 'date'
        });
        const orders = response.data || [];
        const preview = orders.map((o: any) => {
            let metaOrderNumber: string | null = null;
            const meta = (o.meta_data || []) as Array<{ key?: string; value?: string }>;
            for (const m of meta) {
                const k = (m.key || '').toLowerCase();
                if (k === '_order_number' || k === '_wc_order_number' || k === 'order_number' || k === '_sequential_order_number') {
                    metaOrderNumber = m.value != null ? String(m.value).trim() : null;
                    break;
                }
            }
            return {
                id: o.id,
                number: o.number,
                meta_order_number: metaOrderNumber,
                date_created: o.date_created_gmt || o.date_created,
                status: o.status,
                billing_email: o.billing?.email ? '(set)' : '(empty)'
            };
        });

        return NextResponse.json({
            ok: true,
            message: `WooCommerce API is responding. Fetched ${orders.length} most recent order(s).`,
            totalFetched: orders.length,
            ordersPreview: preview,
            hint: 'If "number" equals "id", your store likely uses a plugin that puts the real order number in meta_data (meta_order_number above).'
        });
    } catch (err: any) {
        const message = err?.message || 'Unknown error';
        const status = err?.response?.status;
        const data = err?.response?.data;
        console.error('WooCommerce test error:', { message, status, data });
        return NextResponse.json({
            ok: false,
            error: 'WooCommerce API request failed',
            message,
            status,
            details: data?.message || (typeof data === 'object' ? data : undefined),
            hint: 'Check WOO_URL (e.g. https://yoursite.com), consumer key/secret, and that the REST API is enabled.'
        }, { status: 502 });
    }
}
