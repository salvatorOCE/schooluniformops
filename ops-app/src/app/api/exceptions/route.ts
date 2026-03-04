import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { ExceptionOrder } from '@/lib/types';

/**
 * GET /api/exceptions?schoolCode=XXX
 * Returns On-Hold orders (exceptions) using service-role. Optional schoolCode filters by school.
 * Use this so school users get data on Netlify without relying on anon RLS.
 */
export async function GET(req: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const schoolCode = req.nextUrl.searchParams.get('schoolCode')?.trim() || null;

    try {
        let query = supabaseAdmin
            .from('orders')
            .select(`*, schools (code, name), order_items (*)`)
            .eq('status', 'On-Hold')
            .order('created_at', { ascending: false });

        if (schoolCode) {
            const code = schoolCode.toUpperCase();
            const { data: school } = await supabaseAdmin.from('schools').select('id').eq('code', code).maybeSingle();
            if (school?.id) {
                query = query.eq('school_id', school.id);
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error('Exceptions API Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const exceptions: ExceptionOrder[] = (data || []).map((row: any) => {
            const student_name = row.student_name ?? null;
            const school_code = row.schools?.code ?? null;
            const school_name = row.schools?.name ?? 'Unknown School';
            let exception_type: ExceptionOrder['exception_type'] = 'MISSING_BOTH';
            if (student_name && !school_code) exception_type = 'MISSING_SCHOOL_CODE';
            else if (!student_name && school_code) exception_type = 'MISSING_STUDENT_NAME';

            const rawItems = Array.isArray(row.order_items) ? row.order_items : [];
            const items = rawItems.map((i: any) => ({
                id: i.id,
                product_name: i.name ?? 'Unknown',
                sku: i.sku ?? '',
                quantity: typeof i.quantity === 'number' ? i.quantity : Number(i.quantity) || 1,
                size: i.size ?? undefined,
                requires_embroidery: Boolean(i.requires_embroidery),
                embroidery_status: i.embroidery_status === 'DONE' ? 'DONE' as const : 'PENDING' as const,
                unit_price: i.unit_price != null ? Number(i.unit_price) : undefined,
                sent_quantity: i.sent_quantity != null ? Number(i.sent_quantity) : 0,
                nickname: i.nickname ?? undefined,
            }));

            return {
                id: row.id,
                woo_order_id: row.woo_order_id,
                order_number: row.order_number,
                parent_name: row.customer_name,
                student_name,
                school_id: row.school_id ?? null,
                school_code,
                school_name,
                delivery_type: row.delivery_method,
                embroidery_status: 'PENDING',
                order_status: row.status,
                items,
                created_at: row.created_at,
                paid_at: row.paid_at || row.created_at,
                exception_type,
            } as ExceptionOrder;
        });

        return NextResponse.json(exceptions);
    } catch (err: any) {
        console.error('Exceptions API:', err);
        return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
    }
}
