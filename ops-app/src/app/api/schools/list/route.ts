import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/** GET /api/schools/list
 * Returns all schools with product_count and order_count for the All Schools list.
 */
export async function GET() {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    try {
        let list: { id: string; code: string; name: string; slug: string | null; logo_url: string | null; xero_contact_id?: string | null; created_at: string | null; updated_at: string | null }[];
        const { data: schools, error: schoolsError } = await supabaseAdmin
            .from('schools')
            .select('id, code, name, slug, logo_url, xero_contact_id, created_at, updated_at')
            .order('name');

        if (schoolsError) {
            const code = (schoolsError as { code?: string })?.code;
            if (code === '42703') {
                const { data: fallback, error: fallbackError } = await supabaseAdmin
                    .from('schools')
                    .select('id, code, name, slug, logo_url, created_at, updated_at')
                    .order('name');
                if (fallbackError) {
                    console.error('Schools list fallback query error:', fallbackError);
                    return NextResponse.json({ error: fallbackError.message }, { status: 500 });
                }
                list = (fallback ?? []).map((s: { id: string; code: string; name: string; slug: string | null; logo_url: string | null; created_at: string | null; updated_at: string | null }) => ({ ...s, xero_contact_id: null }));
            } else {
                console.error('Schools list query error:', schoolsError);
                return NextResponse.json({ error: schoolsError.message }, { status: 500 });
            }
        } else {
            list = schools ?? [];
        }

        const ids = list.map((s: { id: string }) => s.id);
        if (ids.length === 0) {
            return NextResponse.json(list);
        }

        const [productsRes, ordersRes] = await Promise.all([
            supabaseAdmin.from('products').select('id, school_id').in('school_id', ids),
            supabaseAdmin.from('orders').select('id, school_id').in('school_id', ids),
        ]);

        const productCountBySchool = new Map<string, number>();
        (productsRes.data ?? []).forEach((p: { school_id: string | null }) => {
            if (p.school_id) {
                productCountBySchool.set(p.school_id, (productCountBySchool.get(p.school_id) ?? 0) + 1);
            }
        });
        const orderCountBySchool = new Map<string, number>();
        (ordersRes.data ?? []).forEach((o: { school_id: string | null }) => {
            if (o.school_id) {
                orderCountBySchool.set(o.school_id, (orderCountBySchool.get(o.school_id) ?? 0) + 1);
            }
        });

        const rows = list.map((s: { id: string; code: string; name: string; slug: string | null; logo_url: string | null; xero_contact_id?: string | null; created_at: string | null; updated_at: string | null }) => ({
            id: s.id,
            code: s.code,
            name: s.name,
            slug: s.slug ?? null,
            logo_url: s.logo_url ?? null,
            xero_contact_id: s.xero_contact_id ?? null,
            created_at: s.created_at ?? null,
            updated_at: s.updated_at ?? null,
            product_count: productCountBySchool.get(s.id) ?? 0,
            order_count: orderCountBySchool.get(s.id) ?? 0,
        }));

        return NextResponse.json(rows);
    } catch (err: unknown) {
        console.error('Schools list error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to fetch schools' },
            { status: 500 }
        );
    }
}
