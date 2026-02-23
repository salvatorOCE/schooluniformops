
import { NextRequest, NextResponse } from 'next/server';
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";

// Initialize WooCommerce API
const startWoo = () => {
    const url = process.env.WOO_URL || 'https://schooluniforms.com.au'; // fallback
    const consumerKey = process.env.WOO_CONSUMER_KEY;
    const consumerSecret = process.env.WOO_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) return null;

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
        // Detailed error logging
        console.error('================ WOO SYNC API ERROR ================');
        console.error('Failed processing wooOrderId:', body?.wooOrderId || 'unknown');
        if (error.response) {
            console.error('Woo Status Code:', error.response.status);
            console.error('Woo Error Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error Message:', error.message);
        }
        console.error('====================================================');

        return NextResponse.json({ error: 'Failed to sync with WooCommerce', details: error.message }, { status: 500 });
    }
}
