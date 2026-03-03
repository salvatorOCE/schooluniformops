import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

const COOKIE_NAME = 'ops_session';

/** GET /api/products/[id]/stats
 * Returns product analytics. School users: units sold, avg per order (no money).
 * Admin: full stats including revenue, cost, profit.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const productId = (await params).id;
    if (!productId) {
        return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const session = cookieStore.get(COOKIE_NAME)?.value ?? '';
    const isSchool = session.startsWith('school:');
    const schoolCode = isSchool ? session.slice(7) : null;

    let schoolId: string | null = null;
    if (isSchool && schoolCode) {
        const { data: school } = await supabaseAdmin
            .from('schools')
            .select('id')
            .eq('code', schoolCode)
            .maybeSingle();
        schoolId = school?.id ?? null;
    }

    try {
        const { data: itemsByProduct, error: itemsError } = await supabaseAdmin
            .from('order_items')
            .select('id, quantity, unit_price, total_price, order_id')
            .eq('product_id', productId);

        if (itemsError) {
            console.error('Product stats query error:', itemsError);
            return NextResponse.json({ error: itemsError.message }, { status: 500 });
        }

        let rows = (itemsByProduct || []) as Array<{ id: string; quantity: number; unit_price: number; total_price: number; order_id: string }>;

        if (rows.length === 0) {
            const { data: product } = await supabaseAdmin
                .from('products')
                .select('sku')
                .eq('id', productId)
                .single();
            const sku = (product as { sku?: string } | null)?.sku;
            if (sku) {
                const { data: skuRows } = await supabaseAdmin
                    .from('order_items')
                    .select('id, quantity, unit_price, total_price, order_id')
                    .eq('sku', sku);
                rows = (skuRows || []) as Array<{ id: string; quantity: number; unit_price: number; total_price: number; order_id: string }>;
            }
        }

        if (rows.length === 0) {
            return NextResponse.json({
                unitsSold: 0,
                numOrders: 0,
                avgPerOrder: 0,
                ...(isSchool ? {} : { revenue: 0, totalCost: 0, profit: 0 }),
            });
        }

        const orderIds = [...new Set(rows.map(r => r.order_id))];
        const { data: ordersData, error: ordersError } = await supabaseAdmin
            .from('orders')
            .select('id, school_id')
            .in('id', orderIds);

        if (ordersError) {
            console.error('Product stats orders query error:', ordersError);
            return NextResponse.json({ error: ordersError.message }, { status: 500 });
        }

        const orderById = new Map((ordersData || []).map((o: { id: string; school_id: string | null }) => [o.id, o]));
        let filteredRows = rows;
        if (schoolId) {
            filteredRows = rows.filter(r => orderById.get(r.order_id)?.school_id === schoolId);
        }

        const unitsSold = filteredRows.reduce((sum, r) => sum + (r.quantity || 0), 0);
        const uniqueOrderIds = new Set(filteredRows.map(r => r.order_id));
        const numOrders = uniqueOrderIds.size;
        const avgPerOrder = numOrders > 0 ? Math.round((unitsSold / numOrders) * 10) / 10 : 0;

        if (isSchool) {
            return NextResponse.json({
                unitsSold,
                numOrders,
                avgPerOrder,
            });
        }

        const revenue = filteredRows.reduce((sum, r) => sum + (Number(r.total_price) || Number(r.unit_price) * (r.quantity || 0)), 0);

        const { data: product } = await supabaseAdmin
            .from('products')
            .select('cost, embroidery_print_cost')
            .eq('id', productId)
            .single();

        const costPerUnit = product
            ? (Number((product as any).cost) || 0) + (Number((product as any).embroidery_print_cost) || 0)
            : 0;
        const totalCost = costPerUnit * unitsSold;
        const profit = revenue - totalCost;

        return NextResponse.json({
            unitsSold,
            numOrders,
            avgPerOrder,
            revenue,
            totalCost,
            profit,
        });
    } catch (err: any) {
        console.error('Product stats error:', err);
        return NextResponse.json({ error: err.message || 'Failed to fetch stats' }, { status: 500 });
    }
}
