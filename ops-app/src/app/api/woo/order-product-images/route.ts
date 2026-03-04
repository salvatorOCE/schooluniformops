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

/** GET /api/woo/order-product-images?orderId=<order-uuid|order_number>
 * Returns per-order-item garment image URLs (front + back) from WooCommerce products.
 * Uses first product image as front, second as back; or meta_data _garment_front_image / _garment_back_image if set.
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
            return NextResponse.json({ items: [] });
        }

        // Load order items in insert order (created_at) so index matches WooCommerce line_items
        const { data: orderRows, error: orderError } = await supabaseAdmin
            .from('order_items')
            .select('id, product_id, name, sku')
            .eq('order_id', orderUuid)
            .order('created_at', { ascending: true });

        if (orderError || !orderRows?.length) {
            return NextResponse.json({ items: [] });
        }

        const productIds = [...new Set(orderRows.map((r: any) => r.product_id).filter(Boolean))] as string[];
        const productIdToWooId = new Map<string, number>();
        if (productIds.length > 0) {
            const { data: products } = await supabaseAdmin
                .from('products')
                .select('id, woocommerce_id')
                .in('id', productIds);
            (products || []).forEach((p: any) => {
                const wooId = p.woocommerce_id ?? p.woo_product_id;
                if (wooId != null) productIdToWooId.set(p.id, Number(wooId));
            });
        }

        // Always fetch Woo order so we have line_items order and can show images for every item (including when product_id is null)
        let wooOrderLineItems: { product_id: number }[] = [];
        const { data: orderRow } = await supabaseAdmin
            .from('orders')
            .select('woo_order_id')
            .eq('id', orderUuid)
            .single();
        const wooOrderId = (orderRow as any)?.woo_order_id;
        if (wooOrderId != null) {
            try {
                const res = await woo.get(`orders/${wooOrderId}`);
                const wooOrder = res.data as any;
                wooOrderLineItems = (wooOrder?.line_items || []).map((li: any) => ({ product_id: Number(li.product_id || 0) }));
            } catch (_) {
                // ignore
            }
        }

        const wooIds = productIdToWooId.size > 0
            ? [...productIdToWooId.values()]
            : wooOrderLineItems.map(li => li.product_id).filter(Boolean);
        const allWooIds = [...new Set([...wooIds, ...wooOrderLineItems.map(li => li.product_id).filter(Boolean)])];
        const imageByWooId = new Map<number, { front: string | null; back: string | null }>();

        for (const wooId of allWooIds) {
            if (!wooId) continue;
            try {
                const res = await woo.get(`products/${wooId}`);
                const prod = res.data as any;
                let front: string | null = null;
                let back: string | null = null;

                if (prod.meta_data && Array.isArray(prod.meta_data)) {
                    const frontMeta = prod.meta_data.find((m: any) =>
                        /garment_front|front_image|_front_garment/i.test(String(m.key))
                    );
                    const backMeta = prod.meta_data.find((m: any) =>
                        /garment_back|back_image|_back_garment/i.test(String(m.key))
                    );
                    if (frontMeta && frontMeta.value) front = String(frontMeta.value);
                    if (backMeta && backMeta.value) back = String(backMeta.value);
                }

                if (!front || !back) {
                    const images = prod.images || [];
                    if (!front && images[0]?.src) front = images[0].src;
                    if (!back && images[1]?.src) back = images[1].src;
                    if (!back && images[0]?.src) back = images[0].src; // fallback to same as front
                }

                imageByWooId.set(wooId, { front, back });
            } catch (_) {
                imageByWooId.set(wooId, { front: null, back: null });
            }
        }

        const productIdToImages = new Map<string, { front: string | null; back: string | null }>();
        productIdToWooId.forEach((wooId, ourId) => {
            productIdToImages.set(ourId, imageByWooId.get(wooId) || { front: null, back: null });
        });

        const items = orderRows.map((r: any, index: number) => {
            let images: { front: string | null; back: string | null } | undefined;
            if (r.product_id) {
                images = productIdToImages.get(r.product_id);
            }
            if (!images && wooOrderLineItems[index]?.product_id) {
                images = imageByWooId.get(wooOrderLineItems[index].product_id) || { front: null, back: null };
            }
            images = images || { front: null, back: null };
            return {
                order_item_id: r.id,
                image_front_url: images.front ?? null,
                image_back_url: images.back ?? null
            };
        });

        return NextResponse.json({ items });
    } catch (err: any) {
        console.error('Order product images API error:', err);
        return NextResponse.json({ error: err.message || 'Failed to fetch images' }, { status: 500 });
    }
}
