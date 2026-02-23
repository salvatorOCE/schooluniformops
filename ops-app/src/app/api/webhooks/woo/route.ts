import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

// Secret from WooCommerce Webhook Settings
const WEBHOOK_SECRET = process.env.WOO_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
    if (!WEBHOOK_SECRET) {
        console.error('WOO_WEBHOOK_SECRET is not defined');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!supabaseAdmin) {
        console.error('Supabase Admin client not initialized');
        return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get('x-wc-webhook-signature');

    // 1. Verify Signature
    if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(body)
        .digest('base64');

    if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = req.headers.get('x-wc-webhook-event'); // 'created', 'updated'
    const payload = JSON.parse(body);
    const wooOrderId = payload.id;

    console.log(`Received Webhook: ${event} for Order #${wooOrderId}`);

    // 2. Idempotency Check
    const { data: existing } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('woo_order_id', wooOrderId)
        .single();

    if (existing) {
        console.log(`Order #${wooOrderId} already exists. Skipping or Updating.`);
        // Ideally we update status if changed, but for 'created' event we skip.
        // For 'updated' event we would match logic.
        return NextResponse.json({ message: 'Order already exists', id: existing.id }, { status: 200 });
    }

    // 3. Parse Order Logic
    try {
        // Extract metadata
        const billing = payload.billing || {};
        const shipping = payload.shipping || {};
        const metaData = payload.meta_data || [];

        // Find School Code (Custom Field or parsing)
        // Heuristic: Looks for 'School' in meta_data or SKU prefix
        let schoolCode = 'UNKNOWN';
        let schoolName = 'Unknown School';

        // Try finding school in meta
        const schoolMeta = metaData.find((m: any) => m.key === 'school_code' || m.key === 'School');
        if (schoolMeta) {
            schoolCode = schoolMeta.value;
        }

        // 4. Map Delivery Method
        const shippingLines = payload.shipping_lines || [];
        const shippingMethodId = shippingLines[0]?.method_id || '';

        let deliveryMethod = 'HOME';
        if (shippingMethodId.includes('local_pickup')) deliveryMethod = 'STORE';
        if (schoolCode !== 'UNKNOWN' && !shippingMethodId.includes('flat_rate')) {
            // Heuristic: if school code is present and not explicitly paid shipping, assume School Delivery
            // This logic needs refinement based on client's specific Woo setup
            deliveryMethod = 'SCHOOL';
        }

        // 5. Create Order in Supabase
        const { data: newOrder, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert({
                woo_order_id: wooOrderId,
                order_number: `SUS-${wooOrderId}`, // Prefix
                status: 'IMPORTED',
                customer_name: `${billing.first_name} ${billing.last_name}`,
                student_name: `${shipping.first_name} ${shipping.last_name}`, // Often student name is in shipping
                delivery_method: deliveryMethod as any,
                shipping_address: {
                    line1: shipping.address_1,
                    line2: shipping.address_2,
                    city: shipping.city,
                    state: shipping.state,
                    postcode: shipping.postcode
                },
                created_at: payload.date_created_gmt,
                paid_at: payload.date_paid_gmt,
                notes: payload.customer_note
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // 6. Create Items
        const items = payload.line_items || [];
        const orderItems = items.map((item: any) => ({
            order_id: newOrder.id,
            woo_product_id: item.product_id,
            name: item.name,
            sku: item.sku || 'NO-SKU',
            quantity: item.quantity,
            size: item.meta_data.find((m: any) => m.key === 'pa_size' || m.key === 'Size')?.value,
            requires_embroidery: true, // Default to true for now, needs product lookup
            embroidery_status: 'PENDING'
        }));

        if (orderItems.length > 0) {
            const { error: itemsError } = await supabaseAdmin
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;
        }

        return NextResponse.json({ message: 'Order synced successfully', id: newOrder.id }, { status: 200 });

    } catch (error: any) {
        console.error('Sync Error:', error);
        // Log to sync_logs table (omitted for brevity)
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
