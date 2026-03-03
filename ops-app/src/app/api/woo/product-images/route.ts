import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

function getWooClient() {
    const url = process.env.WOO_URL;
    const consumerKey = process.env.WOO_CONSUMER_KEY;
    const consumerSecret = process.env.WOO_CONSUMER_SECRET;
    if (!url || !consumerKey || !consumerSecret) return null;
    return new WooCommerceRestApi({ url, consumerKey, consumerSecret, version: 'wc/v3' });
}

/** GET /api/woo/product-images?productId=<uuid>
 * Returns product image URLs (front + back) from WooCommerce for a single product.
 */
export async function GET(req: NextRequest) {
    const productId = req.nextUrl.searchParams.get('productId');
    if (!productId) {
        return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const woo = getWooClient();
    if (!woo) {
        return NextResponse.json({ error: 'WooCommerce not configured' }, { status: 502 });
    }

    try {
        const { data: product, error } = await supabaseAdmin
            .from('products')
            .select('id, woocommerce_id, sku')
            .eq('id', productId)
            .single();

        if (error || !product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        let wooId = (product as any).woocommerce_id ?? (product as any).woo_product_id;

        if (wooId == null && (product as any).sku) {
            try {
                const sku = String((product as any).sku).trim();
                const searchRes = await woo.get(`products?sku=${encodeURIComponent(sku)}&per_page=1`);
                const matches = Array.isArray(searchRes.data) ? searchRes.data : [];
                if (matches.length > 0 && (matches[0] as any).id) {
                    wooId = (matches[0] as any).id;
                }
            } catch (_) {
                // Fallback search failed
            }
        }

        if (wooId == null) {
            return NextResponse.json({ front: null, back: null, images: [] });
        }

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

        const images = prod.images || [];
        if (!front && images[0]?.src) front = images[0].src;
        if (!back && images[1]?.src) back = images[1].src;
        if (!back && images[0]?.src) back = images[0].src;

        const imageUrls = images.map((img: { src?: string }) => img?.src).filter(Boolean);

        return NextResponse.json({ front, back, images: imageUrls });
    } catch (err: any) {
        console.error('Product images API error:', err);
        return NextResponse.json({ error: err.message || 'Failed to fetch images' }, { status: 500 });
    }
}
