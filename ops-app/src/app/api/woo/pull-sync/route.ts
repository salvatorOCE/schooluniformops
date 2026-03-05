import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromCookie } from '@/lib/session-server';
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
    const session = await getSessionFromCookie();
    if (!session) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Supabase Admin not configured' }, { status: 500 });
    }

    try {
        const woo = startWoo();
        if (!woo) {
            return NextResponse.json({ error: 'WooCommerce not configured' }, { status: 500 });
        }


        // Check if this is a full re-sync request or a single-order sync by number
        let body: any = {};
        try { body = await req.json(); } catch { /* empty body is fine */ }
        const isFullSync = body?.fullSync === true;
        const singleOrderNumber = body?.orderNumber != null ? String(body.orderNumber).trim().replace(/^SUS[- ]?/i, '') : null;
        const wooOrderId = body?.wooOrderId != null ? Number(body.wooOrderId) : null;
        /** When syncing by WooCommerce ID, always refresh line items so list shows correct count (not 0) */
        const forceRefreshItems = !!(wooOrderId && Number.isInteger(wooOrderId));

        let allOrders: any[] = [];

        // Single order sync by WooCommerce ID (bulletproof: fetch that exact order)
        if (wooOrderId && Number.isInteger(wooOrderId)) {
            try {
                const res = await woo.get(`orders/${wooOrderId}`);
                const order = res.data;
                if (order?.id) {
                    allOrders = [order];
                    console.log(`Single-order sync by ID: woo_id ${wooOrderId}, syncing...`);
                } else {
                    return NextResponse.json({ success: false, error: `Order ${wooOrderId} not found in WooCommerce` }, { status: 404 });
                }
            } catch (err: any) {
                const status = err?.response?.status;
                const data = err?.response?.data;
                return NextResponse.json({
                    success: false,
                    error: status === 404 ? `Order ${wooOrderId} not found` : 'WooCommerce API error',
                    details: data?.message || err?.message
                }, { status: status === 404 ? 404 : 502 });
            }
        } else if (singleOrderNumber) {
            const recent: any[] = [];
            for (let p = 1; p <= 10; p++) {
                const res = await woo.get('orders', { per_page: 100, page: p, order: 'desc', orderby: 'date' });
                const chunk = res.data || [];
                if (chunk.length === 0) break;
                recent.push(...chunk);
                if (chunk.length < 100) break;
            }
            const norm = (s: string) => s.replace(/^0+/, '') || s; // "0191" -> "191"
            const match = recent.find((o: any) => {
                let raw = o.number != null ? String(o.number).trim() : '';
                if (!raw || raw === String(o.id)) {
                    const meta = (o.meta_data || []) as Array<{ key?: string; value?: string }>;
                    for (const m of meta) {
                        const k = (m.key || '').toLowerCase();
                        const v = m.value != null ? String(m.value).trim() : '';
                        if (v && (k === '_order_number' || k === '_wc_order_number' || k === 'order_number' || k === '_sequential_order_number')) {
                            raw = v;
                            break;
                        }
                    }
                }
                const num = raw.replace(/^SUS[- ]?/i, '');
                return norm(num) === norm(singleOrderNumber) || raw === singleOrderNumber || raw === `SUS-${singleOrderNumber}` || raw === `SUS ${singleOrderNumber}`;
            });
            if (match) {
                allOrders = [match];
                console.log(`Single-order sync: found order ${singleOrderNumber} (woo_id: ${match.id}), syncing...`);
            } else {
                return NextResponse.json({
                    success: false,
                    error: `Order ${singleOrderNumber} not found in WooCommerce (checked ${recent.length} most recent orders)`,
                    checked: recent.length
                }, { status: 404 });
            }
        } else if (isFullSync) {
            // Full sync: paginate through ALL orders (any status); orderby=date so newest are last, we get every page
            const maxPages = 100; // 100 * 100 = 10k orders max
            let page = 1;
            while (page <= maxPages) {
                console.log(`Full sync: fetching page ${page}...`);
                const response = await woo.get('orders', {
                    per_page: 100,
                    page,
                    order: 'asc',
                    orderby: 'date'
                });
                const chunk = response.data || [];
                if (chunk.length === 0) break;
                allOrders = [...allOrders, ...chunk];
                if (chunk.length < 100) break;
                page++;
            }
            console.log(`Full sync: found ${allOrders.length} total orders (${page} pages)`);
        } else {
            // Quick sync: fetch orders after our last known order so we never miss new ones (e.g. 191)
            let afterDate: string;
            const { data: latestOrder } = await supabaseAdmin
                .from('orders')
                .select('created_at')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (latestOrder?.created_at) {
                // Use last order's date minus 1 day so we don't miss same-day or timezone edge cases
                const last = new Date(latestOrder.created_at);
                last.setDate(last.getDate() - 1);
                last.setHours(0, 0, 0, 0);
                afterDate = last.toISOString();
                console.log(`Quick sync: using after=${afterDate} (from last order in DB)`);
            } else {
                // No orders yet: use 30 days ago
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                afterDate = thirtyDaysAgo.toISOString();
                console.log(`Quick sync: no orders in DB, using after=${afterDate}`);
            }

            let page = 1;
            while (true) {
                const response = await woo.get('orders', {
                    after: afterDate,
                    per_page: 100,
                    page,
                    order: 'asc'
                });
                if (response.data.length === 0) break;
                allOrders = [...allOrders, ...response.data];
                if (response.data.length < 100) break;
                page++;
            }
            console.log(`Quick sync: pulled ${allOrders.length} orders after ${afterDate}`);
        }

        const orders = allOrders;
        let syncedCount = 0;
        const syncedOrderNumbers: string[] = [];
        const errors: { woo_order_id: number; order_number?: string; error: string }[] = [];
        const itemsSynced: { orderNumber: string; itemsWritten: number }[] = [];

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

            // Skip cancelled/failed immediately if we don't care, but good to keep records

            // Check if this order already exists with the same status
            const { data: existingOrder } = await supabaseAdmin
                .from('orders')
                .select('id, status')
                .eq('woo_order_id', order.id)
                .single();

            const isNew = !existingOrder;
            const statusChanged = existingOrder && existingOrder.status !== status;

            // Detect senior orders and tag the order number + set is_senior_order for distribution
            // Order number: many stores use a plugin that stores "191" or "SUS-0191" in meta; API often returns order.number = post ID
            let raw = order.number != null ? String(order.number).trim() : '';
            if (!raw || raw === String(order.id)) {
                const meta = (order.meta_data || []) as Array<{ key?: string; value?: string }>;
                for (const m of meta) {
                    const k = (m.key || '').toLowerCase();
                    const v = m.value != null ? String(m.value).trim() : '';
                    if (v && (k === '_order_number' || k === '_wc_order_number' || k === 'order_number' || k === '_sequential_order_number')) {
                        raw = v;
                        break;
                    }
                }
            }
            let orderNumber = /^\d+$/.test(raw) ? `SUS ${raw}` : (raw || `SUS ${order.id}`);
            const seniorKeywords = ['senior', 'year 6', 'yr 6'];
            let isSeniorOrder = false;
            if (orderNumber.includes('(SEN)') || (order.line_items && order.line_items.length > 0)) {
                const allSenior = order.line_items && order.line_items.length > 0 && order.line_items.every((item: any) => {
                    const name = item.name.toLowerCase();
                    return seniorKeywords.some(kw => name.includes(kw));
                });
                if (allSenior) {
                    if (!orderNumber.includes('(SEN)')) orderNumber = `${orderNumber} (SEN)`;
                    isSeniorOrder = true;
                }
            }
            console.log(`[Sync] Order #${orderNumber} (woo_id: ${order.id}) status: ${status}, items: ${order.line_items?.length || 0}`);

            // Use WooCommerce order date placed (not sync time)
            const orderDateCreated = order.date_created_gmt || order.date_created;
            const orderDatePaid = order.date_paid_gmt || order.date_paid || null;

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
                    is_senior_order: isSeniorOrder,
                    created_at: orderDateCreated || undefined,
                    paid_at: orderDatePaid || undefined,
                }, { onConflict: 'woo_order_id' })
                .select()
                .single();

            if (orderError) {
                console.error(`Error upserting order ${order.id}:`, orderError);
                errors.push({ woo_order_id: order.id, order_number: orderNumber, error: orderError.message });
                continue; // Skip items if order fails
            }
            syncedOrderNumbers.push(orderNumber);

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

            if (isNew || hasNoItems || forceRefreshItems) {
                await supabaseAdmin.from('order_items').delete().eq('order_id', upsertedOrder.id);

                // Always fetch full order from Woo when writing items – list endpoint often omits or truncates line_items
                let lineItems: any[] = [];
                if (order.id) {
                    try {
                        const fullRes = await woo.get(`orders/${order.id}`);
                        const fullOrder = fullRes.data as any;
                        lineItems = fullOrder?.line_items || [];
                        if (lineItems.length > 0) {
                            console.log(`[Sync] Order #${orderNumber}: using ${lineItems.length} line_items from full order`);
                        }
                    } catch (err: any) {
                        console.warn(`[Sync] Order #${orderNumber}: could not fetch full order (${err?.message}), using list payload`);
                        lineItems = order.line_items || [];
                    }
                }
                if (lineItems.length === 0) {
                    lineItems = order.line_items || [];
                }

                if (lineItems.length > 0) {
                    const itemsToInsert: any[] = [];

                    for (const item of lineItems) {
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
                        const { error: itemsError } = await supabaseAdmin.from('order_items').insert(itemsToInsert);
                        if (itemsError) {
                            console.error(`[Sync] Failed to insert items for order ${order.id}:`, itemsError.message, itemsError.details);
                            errors.push({ woo_order_id: order.id, order_number: orderNumber, error: `Items: ${itemsError.message}` });
                        } else {
                            console.log(`[Sync] Inserted ${itemsToInsert.length} items for order #${orderNumber}`);
                            if (itemsSynced.length < 20) {
                                itemsSynced.push({ orderNumber, itemsWritten: itemsToInsert.length });
                            }
                        }
                    }
                }
            }

            if (isNew || statusChanged) {
                syncedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            count: syncedCount,
            syncedOrderNumbers,
            itemsSynced: itemsSynced.length ? itemsSynced : undefined,
            errors: errors.length ? errors : undefined
        });

    } catch (error: any) {
        console.error('Pull Sync API Error:', error.response?.data || error);
        return NextResponse.json({ error: 'Failed to sync with WooCommerce', details: error.message }, { status: 500 });
    }
}
