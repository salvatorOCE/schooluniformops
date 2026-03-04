import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { OrderHistoryRecord, OrderHistoryItem, HistoryEvent } from '@/lib/types';

/**
 * GET /api/orders/history?schoolCode=XXX
 * Returns history orders with order_items using service-role so item counts
 * and details are correct regardless of RLS on order_items.
 */
export async function GET(req: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const schoolCode = req.nextUrl.searchParams.get('schoolCode')?.trim() || null;

    try {
        let query = supabaseAdmin
            .from('orders')
            .select(`
                *,
                schools (code, name),
                order_items (*)
            `)
            .order('created_at', { ascending: false })
            .limit(500);

        if (schoolCode) {
            const code = schoolCode.toUpperCase();
            const { data: school } = await supabaseAdmin.from('schools').select('id').eq('code', code).maybeSingle();
            if (school?.id) {
                query = query.eq('school_id', school.id);
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error('History API Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const orderIds = (data || []).map((o: any) => o.id).filter(Boolean);
        let orderIdsWithNotes = new Set<string>();
        if (orderIds.length > 0) {
            const { data: noteRows, error: notesErr } = await supabaseAdmin
                .from('order_notes')
                .select('order_id')
                .in('order_id', orderIds);
            if (!notesErr && noteRows) {
                orderIdsWithNotes = new Set(noteRows.map((r: any) => r.order_id));
            }
        }

        const orders: OrderHistoryRecord[] = (data || []).map((o: any) => {
            const rawItems = Array.isArray(o.order_items) ? o.order_items : [];
            const items: OrderHistoryItem[] = rawItems.map((i: any) => ({
                itemId: i.id,
                sku: i.sku ?? '',
                productName: i.name ?? 'Unknown',
                size: i.size || 'N/A',
                qty: typeof i.quantity === 'number' ? i.quantity : Number(i.quantity) || 1,
                status: i.embroidery_status === 'DONE' ? 'PACKED' : (i.requires_embroidery ? 'PENDING' : 'PACKED'),
            }));

            const events: HistoryEvent[] = [
                {
                    id: `evt-${o.id}-1`,
                    entityType: 'ORDER',
                    entityId: o.order_number,
                    action: 'CREATED',
                    details: 'Order imported',
                    actor: 'System',
                    timestamp: new Date(o.created_at),
                },
            ];
            if (o.paid_at) {
                events.push({
                    id: `evt-${o.id}-2`,
                    entityType: 'ORDER',
                    entityId: o.order_number,
                    action: 'STATUS_CHANGE',
                    details: 'Payment confirmed',
                    actor: 'System',
                    timestamp: new Date(o.paid_at),
                });
            }
            if (o.embroidery_done_at) {
                events.push({
                    id: `evt-${o.id}-3`,
                    entityType: 'ORDER',
                    entityId: o.order_number,
                    action: 'EMBROIDERY_RUN',
                    details: 'Embroidery Machine',
                    actor: 'Operator',
                    timestamp: new Date(o.embroidery_done_at),
                });
            }
            events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            const status = o.status || 'Processing';

            return {
                id: o.id,
                orderId: o.order_number,
                studentName: o.student_name || 'N/A',
                parentName: o.customer_name,
                schoolName: o.schools?.name || 'Unknown',
                schoolCode: o.schools?.code || 'N/A',
                deliveryType: o.delivery_method,
                status,
                items,
                createdAt: new Date(o.created_at),
                updatedAt: new Date(o.paid_at || o.created_at),
                paidAt: o.paid_at ? new Date(o.paid_at) : undefined,
                hasIssues: o.status === 'EXCEPTION',
                hasPartialEmbroidery: false,
                hasNotes: orderIdsWithNotes.has(o.id),
                events,
            };
        });

        return NextResponse.json(orders);
    } catch (err: any) {
        console.error('Orders history API error:', err);
        return NextResponse.json({ error: err?.message || 'Failed to load orders' }, { status: 500 });
    }
}
