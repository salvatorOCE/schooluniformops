import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
    if (!supabaseAdmin) {
        console.error('Supabase Admin client not initialized. Check server environment variables.');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
        const product = await request.json();
        console.log(`Received webhook for product: ${product.id} - ${product.name}`);

        // 1. Identify School from Categories
        // We attempt to match a Product Category to a School Name in our DB
        let schoolId = null;
        if (product.categories && product.categories.length > 0) {
            const categoryNames = product.categories.map((c: any) => c.name);
            const { data: schools } = await supabaseAdmin
                .from('schools')
                .select('id, name')
                .in('name', categoryNames)
                .limit(1);

            if (schools && schools.length > 0) {
                schoolId = schools[0].id;
            }
        }

        // 2. Upsert Product
        const { data: upsertedProduct, error: prodError } = await supabaseAdmin
            .from('products')
            .upsert({
                woocommerce_id: product.id,
                sku: product.sku,
                name: product.name,
                price: product.regular_price || product.price,
                school_id: schoolId,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'woocommerce_id' })
            .select()
            .single();

        if (prodError) {
            console.error('Error upserting product:', prodError);
            throw prodError;
        }

        // 3. Handle Variations (Attributes)
        // If it's a simple product with attributes (like Size) behaving as variations for analytics
        // Or if real variations are synced via a separate webhook (often better foundation).
        // For now, if we have attributes like "Size", let's try to capture them if possible.
        // NOTE: A robust sync requires fetching variations if they are separate entities.
        // Here we just acknowledge the product update.

        return NextResponse.json({ success: true, id: upsertedProduct.id });
    } catch (error: any) {
        console.error('Webhook Processing Error:', error);
        return NextResponse.json({ error: error.message || 'Processing failed' }, { status: 500 });
    }
}
