import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveOrderUuid } from '@/lib/woo-utils';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

const OPS_SESSION_COOKIE = 'ops_session';

function isSchoolUser(sessionValue: string | undefined): boolean {
    if (!sessionValue) return false;
    return sessionValue.startsWith('school:');
}

function getWooClient() {
    const url = process.env.WOO_URL;
    const consumerKey = process.env.WOO_CONSUMER_KEY;
    const consumerSecret = process.env.WOO_CONSUMER_SECRET;
    if (!url || !consumerKey || !consumerSecret) return null;
    return new WooCommerceRestApi({ url, consumerKey, consumerSecret, version: 'wc/v3' });
}

/** Build a minimal order-details payload from Supabase row (for non-Woo orders or when Woo fetch fails). */
async function buildFallbackOrder(orderUuid: string): Promise<Record<string, unknown> | null> {
    if (!supabaseAdmin) return null;
    const { data: row, error } = await supabaseAdmin
        .from('orders')
        .select('created_at, paid_at, status, shipping_address, order_number, customer_name, student_name')
        .eq('id', orderUuid)
        .single();
    if (error || !row) return null;
    const created = (row as { created_at?: string })?.created_at;
    const paid = (row as { paid_at?: string | null })?.paid_at;
    const shipping = (row as { shipping_address?: unknown })?.shipping_address as Record<string, unknown> | undefined;
    return {
        date_created: created ?? undefined,
        date_modified: paid ?? created ?? undefined,
        date_paid: paid ?? undefined,
        status: (row as { status?: string })?.status ?? 'Processing',
        order_number: (row as { order_number?: string })?.order_number,
        billing: undefined,
        shipping: shipping && typeof shipping === 'object' ? shipping : undefined,
        payment_method_title: 'School / Bulk order',
        total: undefined,
        customer_note: undefined,
    };
}

/** GET /api/woo/order-details?orderId=<supabase-order-uuid|order_number>
 * Fetches full WooCommerce order when linked; otherwise returns minimal details from Supabase (e.g. bulk/school orders).
 */
export async function GET(req: NextRequest) {
    const orderId = req.nextUrl.searchParams.get('orderId');
    if (!orderId) {
        return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
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

        if (error) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const wooOrderId = orderRow?.woo_order_id;
        const isFakeOrMissing = wooOrderId == null || (typeof wooOrderId === 'number' && wooOrderId < 1);

        if (isFakeOrMissing) {
            const fallback = await buildFallbackOrder(orderUuid);
            if (fallback) return NextResponse.json(fallback);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const woo = getWooClient();
        if (!woo) {
            const fallback = await buildFallbackOrder(orderUuid);
            if (fallback) return NextResponse.json(fallback);
            return NextResponse.json({ error: 'WooCommerce not configured' }, { status: 502 });
        }

        const response = await woo.get(`orders/${wooOrderId}`);
        const order = response.data;
        if (!order) {
            const fallback = await buildFallbackOrder(orderUuid);
            if (fallback) return NextResponse.json(fallback);
            return NextResponse.json({ error: 'WooCommerce order not found' }, { status: 404 });
        }

        // School users: strip billing address only; keep email and phone for contact
        const cookieStore = await cookies();
        const session = cookieStore.get(OPS_SESSION_COOKIE)?.value;
        if (isSchoolUser(session) && order) {
            const o = order as { billing?: { email?: string; phone?: string; [k: string]: unknown }; [k: string]: unknown };
            const billing = o.billing;
            const sanitizedBilling = billing
                ? { email: billing.email ?? undefined, phone: billing.phone ?? undefined }
                : undefined;
            return NextResponse.json({ ...o, billing: sanitizedBilling });
        }

        return NextResponse.json(order);
    } catch (err: any) {
        console.error('Order details fetch error:', err?.response?.data || err);
        try {
            const orderUuid = await resolveOrderUuid(orderId);
            if (orderUuid) {
                const fallback = await buildFallbackOrder(orderUuid);
                if (fallback) return NextResponse.json(fallback);
            }
        } catch (_) {
            // ignore
        }
        return NextResponse.json(
            { error: err?.response?.data?.message || err?.message || 'Failed to fetch order details' },
            { status: 500 }
        );
    }
}
