import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { FixUpRequest } from '@/lib/types';

/**
 * GET /api/fix-ups?schoolCode=XXX
 * Returns fix-ups with order/school info using service-role. Optional schoolCode filters by school.
 * Use this so school users get Recovery Center data on Netlify without relying on anon RLS.
 */
export async function GET(req: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const schoolCode = req.nextUrl.searchParams.get('schoolCode')?.trim() || null;

    try {
        const { data: fixUpRows, error } = await supabaseAdmin
            .from('fix_ups')
            .select(`
                *,
                orders (
                    order_number,
                    customer_name,
                    student_name,
                    shipping_address,
                    school_id,
                    schools (code, name)
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fix-ups API Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        let list = (fixUpRows || []).map((row: any) => {
            const o = row.orders;
            const schoolName = o?.schools?.name ?? 'Unknown';
            const schoolCodeVal = o?.schools?.code ?? null;
            return {
                id: row.id,
                original_order_id: row.original_order_id || '',
                original_order_number: o?.order_number || 'UNKNOWN',
                student_name: o?.student_name || 'Unknown',
                parent_name: o?.customer_name ?? null,
                parent_email: (o?.shipping_address as any)?.email ?? null,
                parent_phone: (o?.shipping_address as any)?.phone ?? null,
                school_name: schoolName,
                school_code: schoolCodeVal,
                type: row.type,
                status: row.status,
                priority: (row.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH') as FixUpRequest['priority'],
                items: Array.isArray(row.items) ? row.items : [],
                notes: row.notes || '',
                created_at: row.created_at,
                school_id: o?.school_id ?? null,
            };
        });

        if (schoolCode) {
            const code = schoolCode.toUpperCase();
            list = list.filter(
                (f: { school_code?: string | null }) =>
                    f.school_code && (f.school_code === code || f.school_code.toUpperCase() === code)
            );
        }

        return NextResponse.json(list as FixUpRequest[]);
    } catch (err: any) {
        console.error('Fix-ups API:', err);
        return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
    }
}
