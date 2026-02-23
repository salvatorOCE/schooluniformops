import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
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
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Supabase Admin not configured' }, { status: 500 });
    }

    try {
        const woo = startWoo();
        if (!woo) {
            return NextResponse.json({ error: 'WooCommerce not configured' }, { status: 500 });
        }


        // Check if this is a full re-sync request
        let body: any = {};
        try { body = await req.json(); } catch { /* empty body is fine */ }
        const isFullSync = body?.fullSync === true;

        let allOrders: any[] = [];

        if (isFullSync) {
            // Full sync: paginate through ALL orders
            let page = 1;
            while (true) {
                console.log(`Full sync: fetching page ${page}...`);
                const response = await woo.get('orders', {
                    per_page: 100,
                    page,
                    order: 'asc'
                });
                if (response.data.length === 0) break;
                allOrders = [...allOrders, ...response.data];
                page++;
            }
            console.log(`Full sync: found ${allOrders.length} total orders`);
        } else {
            // Quick sync: last 7 days only
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const afterDate = sevenDaysAgo.toISOString();
            console.log(`Quick sync: pulling orders after ${afterDate}...`);
            const response = await woo.get('orders', {
                after: afterDate,
                per_page: 100,
                order: 'asc'
            });
            allOrders = response.data;
        }

        const orders = allOrders;
        let syncedCount = 0;

        for (const order of orders) {
            // Replicate Webhook parsing logic
            let schoolId = null;
            if (order.line_items && order.line_items.length > 0) {
                const wooProductIds = order.line_items.map((item: any) => item.product_id);
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
            if (order.shipping_lines && order.shipping_lines.length > 0) {
                const method = order.shipping_lines[0].method_title.toUpperCase();
                if (method.includes('TERM')) deliveryType = 'SCHOOL';
                if (method.includes('PICKUP') || method.includes('COLLECT')) deliveryType = 'STORE';
            }

            const studentName = order.shipping?.first_name
                ? `${order.shipping.first_name} ${order.shipping.last_name}`.trim()
                : `${order.billing?.first_name} ${order.billing?.last_name}`.trim();
            const parentName = `${order.billing?.first_name} ${order.billing?.last_name}`.trim();

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
                'on-hold': 'On-Hold',
                'cancelled': 'Cancelled',
                'refunded': 'Refunded',
                'failed': 'Failed'
            };

            if (statusMap[wooStatus]) {
                status = statusMap[wooStatus];
            }

            // Skip cancelled/failed immediately if we don't care, but good to keep records

            // Check if this order already exists with the same status
            const { data: existingOrder } = await supabaseAdmin
                .from('orders')
                .select('id, status')
                .eq('woo_order_id', order.id)
                .single();

            const isNew = !existingOrder;
            const statusChanged = existingOrder && existingOrder.status !== status;

            // Detect senior orders and tag the order number
            let orderNumber = String(order.number);
            const seniorKeywords = ['senior', 'year 6', 'yr 6'];
            if (!orderNumber.includes('(SEN)') && order.line_items && order.line_items.length > 0) {
                const allSenior = order.line_items.every((item: any) => {
                    const name = item.name.toLowerCase();
                    return seniorKeywords.some(kw => name.includes(kw));
                });
                if (allSenior) {
                    orderNumber = `${orderNumber} (SEN)`;
                }
            }
            console.log(`[Sync] Order #${orderNumber} (woo_id: ${order.id}) status: ${status}, items: ${order.line_items?.length || 0}`);

            // Upsert Order
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
                }, { onConflict: 'woo_order_id' })
                .select()
                .single();

            if (orderError) {
                console.error(`Error upserting order ${order.id}:`, orderError);
                continue; // Skip items if order fails
            }

            // Sync items for: new orders OR orders that have no items (backfill)
            // NEVER delete existing items — only fill in missing ones
            let hasNoItems = false;
            if (!isNew) {
                const { count } = await supabaseAdmin
                    .from('order_items')
                    .select('id', { count: 'exact', head: true })
                    .eq('order_id', upsertedOrder.id);
                hasNoItems = (count ?? 0) === 0;
            }

            if (isNew || hasNoItems) {
                await supabaseAdmin.from('order_items').delete().eq('order_id', upsertedOrder.id);

                if (order.line_items && order.line_items.length > 0) {
                    const itemsToInsert = [];

                    for (const item of order.line_items) {
                        let productId = null;
                        if (item.product_id) {
                            const { data: prod } = await supabaseAdmin
                                .from('products')
                                .select('id')
                                .eq('woocommerce_id', item.product_id)
                                .single();
                            if (prod) productId = prod.id;
                        }

                        // Extract size if possible from metadata
                        let size = null;
                        if (item.meta_data) {
                            const sizeMeta = item.meta_data.find((m: any) => m.key.toLowerCase().includes('size') || m.key === 'pa_size');
                            if (sizeMeta) size = sizeMeta.value;
                        }

                        itemsToInsert.push({
                            order_id: upsertedOrder.id,
                            product_id: productId,
                            name: item.name || 'Unknown Product',
                            sku: item.sku || `WOO-${item.product_id || 'UNKNOWN'}`,
                            quantity: item.quantity || 1,
                            size: size,
                            unit_price: parseFloat(item.price) || 0,
                            total_price: parseFloat(item.total) || 0,
                        });
                    }

                    if (itemsToInsert.length > 0) {
                        const { error: itemsError } = await supabaseAdmin.from('order_items').insert(itemsToInsert);
                        if (itemsError) {
                            console.error(`[Sync] Failed to insert items for order ${order.id}:`, itemsError.message, itemsError.details);
                        } else {
                            console.log(`[Sync] Inserted ${itemsToInsert.length} items for order #${orderNumber}`);
                        }
                    }
                }
            }

            if (isNew || statusChanged) {
                syncedCount++;
            }
        }

        return NextResponse.json({ success: true, count: syncedCount });

    } catch (error: any) {
        console.error('Pull Sync API Error:', error.response?.data || error);
        return NextResponse.json({ error: 'Failed to sync with WooCommerce', details: error.message }, { status: 500 });
    }
}
