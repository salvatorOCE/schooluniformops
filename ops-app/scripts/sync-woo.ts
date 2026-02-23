
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";

const productsOnly = process.argv.includes('--products-only');

// --- Configuration ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WOO_URL = process.env.WOO_URL || 'https://schooluniforms.com.au';
const WOO_CK = process.env.WOO_CONSUMER_KEY;
const WOO_CS = process.env.WOO_CONSUMER_SECRET;

if (!SUPABASE_URL || !SUPABASE_KEY || !WOO_CK || !WOO_CS) {
    console.error('Missing environment variables. Check .env.local');
    process.exit(1);
}

// --- Clients ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const woo = new WooCommerceRestApi({
    url: WOO_URL, // TODO: User needs to update this or I should extract from env?
    // User didn't provide URL in prompt, but I saw screenshots. defaulting to localhost or prompting?
    // I'll assume usage of localhost for dev, but let's use a placeholder and warn
    consumerKey: WOO_CK,
    consumerSecret: WOO_CS,
    version: 'wc/v3'
});

// Since I don't know the URL, I'll default to 'http://localhost' if not provided, but warn
// Actually, let's use process.env.WOO_URL if available, else warn.

// --- Types ---
interface WooProduct {
    id: number;
    name: string;
    slug: string;
    sku: string;
    price: string;
    categories: { id: number; name: string; slug: string }[];
    attributes: { id: number; name: string; options: string[] }[];
}

interface WooOrder {
    id: number;
    number: string;
    status: string;
    date_created_gmt: string;
    date_paid_gmt: string;
    total: string;
    billing: { first_name: string; last_name: string; email: string };
    shipping: { first_name: string; last_name: string; address_1: string; city: string; state: string; postcode: string };
    line_items: any[];
    shipping_lines: any[];
    meta_data: any[];
    customer_note: string;
}

// --- Helpers ---
async function fetchAll(endpoint: string, params: any = {}): Promise<any[]> {
    let page = 1;
    let results: any[] = [];
    while (true) {
        console.log(`Fetching ${endpoint} page ${page}...`);
        try {
            const { data } = await woo.get(endpoint, { ...params, page, per_page: 50 });
            if (data.length === 0) break;
            results = [...results, ...data];
            page++;
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            break;
        }
    }
    return results;
}

// --- Main Sync Logic ---
async function sync() {
    console.log('Starting sync...');

    // 1. Sync Products (and Schools via Category)
    const products = await fetchAll('products');
    console.log(`Found ${products.length} products to sync.`);

    const schoolMap = new Map<string, string>(); // Name -> UUID

    for (const p of products as WooProduct[]) {
        // Determine School from Categories
        let schoolName = 'Unknown School';
        // Logic: First category that isn't "Uncategorized"
        const cat = p.categories.find(c => c.name !== 'Uncategorized');
        if (cat) schoolName = cat.name;

        // Ensure School Exists
        let schoolId = schoolMap.get(schoolName);
        if (!schoolId) {
            const { data: school, error } = await supabase
                .from('schools')
                .select('id')
                .eq('name', schoolName)
                .single();

            if (school) {
                schoolId = school.id;
            } else {
                // Create School
                const code = schoolName.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8); // Simple code gen
                const { data: newSchool, error: createError } = await supabase
                    .from('schools')
                    .insert({ name: schoolName, code, slug: cat?.slug || 'unknown' })
                    .select('id')
                    .single();

                if (createError) {
                    // Only error if not unique constraint (might have been created in parallel or race cond)
                    // For script simplicity, ignore and re-fetch or log
                    console.warn(`Could not create school ${schoolName}:`, createError.message);
                    // Try fetch again
                    const { data: retry } = await supabase.from('schools').select('id').eq('name', schoolName).single();
                    if (retry) schoolId = retry.id;
                } else if (newSchool) {
                    schoolId = newSchool.id;
                    console.log(`Created school: ${schoolName} (${code})`);
                }
            }
            if (schoolId) schoolMap.set(schoolName, schoolId);
        }

        // Upsert Product
        const { error: prodError } = await supabase
            .from('products')
            .upsert({
                woocommerce_id: p.id,
                sku: p.sku || `WOO-${p.id}`,
                name: p.name,
                price: parseFloat(p.price || '0'),
                category: schoolName, // Using school name as category for now
                school_id: schoolId,
                attributes: p.attributes,
                requires_embroidery: true // Default true for now
            }, { onConflict: 'woocommerce_id' });

        if (prodError) console.error(`Failed to sync product ${p.name}:`, prodError.message);
    }

    if (productsOnly) {
        console.log('Products + schools sync complete (--products-only). Run FULL sync from the OPS app to pull orders.');
        return;
    }

    // Build Product Map (Woo ID -> {id, isSenior})
    // We need to know if a product is "Senior" to tag the order
    const productDetailsMap = new Map<number, { id: string, isSenior: boolean }>();

    // We can iterate the products array we just fetched, assuming it has up-to-date categories
    // But products array above might be incomplete if pagination logic was complex (it is handled by fetchAll)
    // Let's assume 'products' contains all synced products.
    // However, the `fetchAll` returns `any[]`. We should iterate `products` array.

    (products as WooProduct[]).forEach(p => {
        // Check if category indicates Senior/Leavers
        const isSenior = p.categories.some(c =>
            c.name.toLowerCase().includes('senior') ||
            c.name.toLowerCase().includes('leaver') ||
            c.slug.includes('senior') ||
            c.slug.includes('leaver')
        );
        // We need the UUID from Supabase, so let's fetch map first or just query DB
        // Query DB is safer to get UUIDs
    });

    // Fetch all products with UUIDs from DB to build map
    const { data: dbProducts } = await supabase.from('products').select('id, woocommerce_id, school_id, name, category');

    dbProducts?.forEach(p => {
        // Simple heuristic for now based on name or category since we didn't store is_senior in products table
        // Ideally products table should have is_senior.
        // For now, let's use the Name/Category from DB if possible, or fallback.
        // But better to use the Woo data we just fetched.
        const wooProd = (products as WooProduct[]).find(wp => wp.id === p.woocommerce_id);
        const isSenior = wooProd ? wooProd.categories.some(c =>
            c.name.toLowerCase().includes('senior') ||
            c.name.toLowerCase().includes('leaver')
        ) : false;

        productDetailsMap.set(p.woocommerce_id, { id: p.id, isSenior });
    });

    // 2. Sync Orders
    const orders = await fetchAll('orders');
    console.log(`Found ${orders.length} orders to sync.`);

    for (const o of orders as WooOrder[]) {
        // Determine School
        let schoolId = null;
        // Logic: Try to find school from first product's category (which we mapped to School)
        if (o.line_items.length > 0) {
            const firstProdId = o.line_items[0].product_id;
            const dbProd = dbProducts?.find(p => p.woocommerce_id === firstProdId);
            if (dbProd) schoolId = dbProd.school_id;
        }

        // Refetch detailed product map with school_id
        // NOTE: This is getting complex inside the loop. Let's optimize:
        // We'll skip complex school logic for now and rely on existing 'school_id' if we can,
        // or just use the one from the first product.

        // Map Status
        const statusMap: Record<string, string> = {
            'processing': 'IMPORTED',
            'wc-embroidery': 'IN_EMBROIDERY',
            'embroidery': 'IN_EMBROIDERY',
            'wc-distribution': 'AWAITING_PACK',
            'distribution': 'AWAITING_PACK',
            'wc-packed': 'PACKED',
            'packed': 'PACKED',
            'completed': 'DISPATCHED',
            'on-hold': 'EXCEPTION',
            'cancelled': 'CANCELLED',
            'refunded': 'CANCELLED',
            'failed': 'CANCELLED',
            'driver-assigned': 'READY'
        };

        let status = statusMap[o.status.toLowerCase()] || 'IMPORTED';

        // Metadata Overrides
        const metaStatus = o.meta_data.find((m: any) => m.key === '_ops_status')?.value;
        if (metaStatus) status = metaStatus;

        // Delivery Method
        let delivery = 'HOME';
        const shippingMethod = o.shipping_lines[0]?.method_id || '';
        const shippingTitle = o.shipping_lines[0]?.method_title?.toLowerCase() || '';

        // 1. Check Metadata
        const metaDelivery = o.meta_data.find((m: any) => m.key === '_delivery_type' || m.key === 'delivery_type')?.value;
        if (metaDelivery) {
            delivery = metaDelivery.toUpperCase();
        } else {
            // 2. Infer from shipping method
            if (shippingMethod.includes('local_pickup') || shippingTitle.includes('pickup') || shippingTitle.includes('collection')) {
                delivery = 'STORE'; // Default to Store if generic pickup
                if (shippingTitle.includes('school')) delivery = 'SCHOOL';
            }
        }

        // Is Senior / School Run?
        // Check checks items
        let isSenior = false;
        let isSchoolRun = false; // Default false unless tagged

        // Check Metadata for override
        const metaSchoolRun = o.meta_data.find((m: any) => m.key === '_is_school_run' || m.key === 'school_run')?.value;
        if (metaSchoolRun === 'yes' || metaSchoolRun === 'true') isSchoolRun = true;

        const metaSenior = o.meta_data.find((m: any) => m.key === '_is_senior_order' || m.key === 'senior_order')?.value;
        if (metaSenior === 'yes' || metaSenior === 'true') isSenior = true;

        // Check Items if not overridden
        if (!isSenior) {
            isSenior = o.line_items.some((i: any) => {
                const details = productDetailsMap.get(i.product_id);
                return details?.isSenior || i.name.toLowerCase().includes('senior') || i.name.toLowerCase().includes('leaver');
            });
        }

        // School ID logic (simplified: first product's school)
        // We need school_id for the order.
        // Let's assume we can get it from the product map if we fetch it.
        // For this script, I'll rely on a separate query or just ignore school_id for now if not critical,
        // BUT it IS critical for the app.
        // I will do a quick lookup cache.

        // Upsert Order
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .upsert({
                woo_order_id: o.id,
                order_number: `SUS ${o.number}`,
                status: status.toUpperCase(),
                customer_name: `${o.billing.first_name} ${o.billing.last_name}`,
                student_name: o.shipping.first_name
                    ? `${o.shipping.first_name} ${o.shipping.last_name}`
                    : `${o.billing.first_name} ${o.billing.last_name}`,
                delivery_method: delivery,
                school_id: schoolId,
                created_at: o.date_created_gmt,
                paid_at: o.date_paid_gmt,
                notes: o.customer_note,
                shipping_address: o.shipping,
                is_school_run: isSchoolRun,
                is_senior_order: isSenior,
                has_issues: o.status === 'on-hold'
            }, { onConflict: 'woo_order_id' })
            .select('id')
            .single();

        if (orderError) {
            console.error(`Failed to sync order ${o.id}:`, orderError.message);
            continue;
        }

        if (!orderData) continue;

        // Upsert Items
        const items = o.line_items.map((i: any) => ({
            order_id: orderData.id,
            // product_id: ... // need to map via woo_product_id using productDetailsMap
            product_id: productDetailsMap.get(i.product_id)?.id || null,
            sku: i.sku || 'NO-SKU',
            name: i.name,
            quantity: i.quantity,
            unit_price: parseFloat(i.price || '0'),
            size: i.meta_data.find((m: any) => m.key === 'pa_size' || m.key === 'Size')?.value,
            requires_embroidery: true,
            embroidery_status: 'PENDING'
        }));

        if (items.length > 0) {
            await supabase.from('order_items').delete().eq('order_id', orderData.id);
            const { error: itemsError } = await supabase.from('order_items').insert(items);
            if (itemsError) console.error(`Failed items for order ${o.id}:`, itemsError.message);
        }
    }

    console.log('Sync complete!');
}

sync().catch(console.error);
