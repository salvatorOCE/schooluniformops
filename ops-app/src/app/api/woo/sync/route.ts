
import { NextRequest, NextResponse } from 'next/server';
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";

// Initialize WooCommerce API
const startWoo = () => {
    const url = process.env.WOO_URL;
    const consumerKey = process.env.WOO_CONSUMER_KEY;
    const consumerSecret = process.env.WOO_CONSUMER_SECRET;

    if (!url || !consumerKey || !consumerSecret) return null;

    return new WooCommerceRestApi({
        url,
        consumerKey,
        consumerSecret,
        version: 'wc/v3'
    });
};

export async function POST(req: NextRequest) {
    let body: any;
    try {
        body = await req.json();
        const { wooOrderId, status, note } = body;

        if (!wooOrderId || !status) {
            return NextResponse.json({ error: 'Missing wooOrderId or status' }, { status: 400 });
        }

        // Safety Toggle check
        const isSyncEnabled = process.env.WOO_SYNC_ENABLED === 'true';
        if (!isSyncEnabled) {
            console.log(`[DRY RUN] Would update Woo Order ${wooOrderId} to status: ${status}`);
            return NextResponse.json({
                success: true,
                message: 'Dry run: Sync is currently disabled',
                dryRun: true
            }, { status: 200 });
        }

        const woo = startWoo();
        if (!woo) {
            return NextResponse.json({ error: 'WooCommerce not configured' }, { status: 500 });
        }

        // Map display name to WooCommerce slug
        const statusMap: Record<string, string> = {
            'Pending payment': 'pending',
            'Processing': 'processing',
            'In Production': 'in-production',
            'Embroidery': 'embroidery',
            'Distribution': 'distribution',
            'Packed': 'packed',
            'Shipped': 'shipped',
            'Completed': 'completed',
            'Partial Order Complete': 'partial-order-complete',
            'On hold': 'on-hold',
            'On-Hold': 'on-hold',
            'Cancelled': 'cancelled',
            'Refunded': 'refunded',
            'Failed': 'failed',
            'Trash': 'trash'
        };

        const wooStatus = statusMap[status] || status.toLowerCase();
        const data: any = { status: wooStatus };

        if (note) {
            // Add note logic
        }

        const response = await woo.put(`orders/${wooOrderId}`, data);

        if (note) {
            await woo.post(`orders/${wooOrderId}/notes`, { note, customer_note: true });
        }

        return NextResponse.json({ success: true, data: response.data }, { status: 200 });

    } catch (error: any) {
        const statusCode = error.response?.status;
        const wooData = error.response?.data;

        console.error('================ WOO SYNC API ERROR ================');
        console.error('Failed processing wooOrderId:', body?.wooOrderId || 'unknown');
        if (error.response) {
            console.error('Woo Status Code:', statusCode);
            console.error('Woo Error Data:', JSON.stringify(wooData, null, 2));
        } else {
            console.error('Error Message:', error.message);
        }
        console.error('====================================================');

        // 400 = WooCommerce rejected the status (e.g. custom status "packed" not registered).
        // Return 200 with success: false so the client doesn't block the pack flow.
        if (statusCode === 400) {
            return NextResponse.json({
                success: false,
                error: 'WooCommerce rejected the status. Your store may not have custom statuses (e.g. "packed"). Order was updated in Ops only.',
                details: typeof wooData?.message === 'string' ? wooData.message : error.message
            }, { status: 200 });
        }

        return NextResponse.json({ error: 'Failed to sync with WooCommerce', details: error.message }, { status: 500 });
    }
}
