import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
        const order = await request.json();
        console.log(`Received webhook for order: ${order.id} - ${order.number}`);

        // 1. Identify School Name from Items
        let schoolId = null;
        if (order.line_items && order.line_items.length > 0) {
            // Get WooCommerce Product IDs
            const wooProductIds = order.line_items.map((item: any) => item.product_id);

            // Find first product that has a school assigned in our DB
            const { data: matchedProducts } = await supabaseAdmin
                .from('products')
                .select('school_id')
                .in('woocommerce_id', wooProductIds)
                .not('school_id', 'is', null)
                .limit(1);

            if (matchedProducts && matchedProducts.length > 0) {
                schoolId = matchedProducts[0].school_id;
            }
        }

        let deliveryType = 'HOME';
        // Map shipping method to Delivery Type
        if (order.shipping_lines && order.shipping_lines.length > 0) {
            const method = order.shipping_lines[0].method_title.toUpperCase();
            if (method.includes('TERM')) deliveryType = 'SCHOOL';
            if (method.includes('PICKUP') || method.includes('COLLECT')) deliveryType = 'STORE';
        }

        // Student name is often in shipping (billing is usually the parent)
        const studentName = order.shipping?.first_name
            ? `${order.shipping.first_name} ${order.shipping.last_name}`
            : `${order.billing?.first_name} ${order.billing?.last_name}`;
        const parentName = `${order.billing?.first_name} ${order.billing?.last_name}`;

        // Map WooCommerce status to internal Ops App status
        let status = 'Processing';
        const wooStatus = order.status.toLowerCase();

        const statusMap: Record<string, string> = {
            'pending': 'Pending Payment',
            'processing': 'Processing',
            'waiting': 'Processing',
            'supplier-ordered': 'Processing',
            'stock-arrived': 'Processing',
            'in-production': 'In Production',
            'embroidery': 'Embroidery',
            'distribution': 'Distribution',
            'ready-to-ship': 'Distribution',
            'packed': 'Packed',
            'shipped': 'Shipped',
            'completed': 'Completed',
            'partial-order-complete': 'Partial Order Complete',
            'partial-complete': 'Partial Order Complete',
            'on-hold': 'On-Hold',
            'cancelled': 'Cancelled',
            'refunded': 'Refunded',
            'failed': 'Failed'
        };

        if (statusMap[wooStatus]) {
            status = statusMap[wooStatus];
        }

        // Use WooCommerce order date placed and date paid (not webhook receive time)
        const orderDateCreated = order.date_created_gmt || order.date_created;
        const orderDatePaid = order.date_paid_gmt || order.date_paid || null;

        // Order number: plugin may store "191" or "SUS-0191" in meta; API often has order.number = post ID
        let rawNum = order.number != null ? String(order.number).trim() : '';
        if (!rawNum || rawNum === String(order.id)) {
            const meta = (order.meta_data || []) as Array<{ key?: string; value?: string }>;
            for (const m of meta) {
                const k = (m.key || '').toLowerCase();
                const v = m.value != null ? String(m.value).trim() : '';
                if (v && (k === '_order_number' || k === '_wc_order_number' || k === 'order_number' || k === '_sequential_order_number')) {
                    rawNum = v;
                    break;
                }
            }
        }
        const orderNumber = /^\d+$/.test(rawNum) ? `SUS ${rawNum}` : (rawNum || `SUS ${order.id}`);

        // 2. Upsert Order
        const { data: upsertedOrder, error: orderError } = await supabaseAdmin
            .from('orders')
            .upsert({
                woo_order_id: order.id,
                order_number: orderNumber,
                status: status,
                school_id: schoolId,
                delivery_method: deliveryType,
                student_name: studentName,
                customer_name: parentName,
                created_at: orderDateCreated || undefined,
                paid_at: orderDatePaid || undefined,
            }, { onConflict: 'woo_order_id' })
            .select()
            .single();

        if (orderError) throw orderError;

        // 3. Handle Line Items
        // First delete existing items for this order to handle updates (resync)
        await supabaseAdmin.from('order_items').delete().eq('order_id', upsertedOrder.id);

        if (order.line_items && order.line_items.length > 0) {
            const itemsToInsert = [];

            for (const item of order.line_items) {
                // Resolve product UUID
                let productId = null;
                if (item.product_id) {
                    const { data: prod } = await supabaseAdmin
                        .from('products')
                        .select('id')
                        .eq('woocommerce_id', item.product_id)
                        .single();
                    if (prod) productId = prod.id;
                }

                // Extract size and nickname from line item meta_data (WooCommerce can use key, display_key, value, display_value)
                let size = null;
                let nickname: string | null = null;
                if (item.meta_data && Array.isArray(item.meta_data)) {
                    for (const m of item.meta_data) {
                        const k = (m.key ?? m.display_key ?? '').toString().trim();
                        const v = (m.value ?? m.display_value ?? '').toString().trim();
                        if (k === 'pa_size' || k.toLowerCase().includes('size')) {
                            if (v) size = v;
                        } else if (k.toLowerCase().includes('nickname')) {
                            if (v) nickname = v;
                        }
                    }
                }

                itemsToInsert.push({
                    order_id: upsertedOrder.id,
                    product_id: productId,
                    name: item.name || 'Unknown Product',
                    sku: item.sku || `WOO-${item.product_id || 'UNKNOWN'}`,
                    quantity: item.quantity || 1,
                    size: size,
                    nickname: nickname,
                    unit_price: parseFloat(item.price) || 0,
                    total_price: parseFloat(item.total) || 0,
                    requires_embroidery: false,
                    embroidery_status: 'NA',
                });
            }

            if (itemsToInsert.length > 0) {
                const { error: itemsError } = await supabaseAdmin
                    .from('order_items')
                    .insert(itemsToInsert);

                if (itemsError) throw itemsError;
            }
        }

        return NextResponse.json({ success: true, id: upsertedOrder.id });
    } catch (error: any) {
        console.error('Webhook Processing Error:', error);
        return NextResponse.json({ error: error.message || 'Processing failed' }, { status: 500 });
    }
}
