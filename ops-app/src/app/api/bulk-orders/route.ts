/**
 * GET /api/bulk-orders — list bulk orders.
 * Admin: all bulk orders. School: only their school's bulk orders.
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromCookie } from '@/lib/session-server';
import type { Order } from '@/lib/types';

function mapOrder(row: any): Order {
  const schools = row.schools;
  const school = Array.isArray(schools) ? schools[0] : schools;
  return {
    id: row.id,
    woo_order_id: row.woo_order_id,
    order_number: row.order_number,
    parent_name: row.customer_name,
    student_name: row.student_name,
    school_id: row.school_id || null,
    school_code: school?.code || null,
    school_name: school?.name || 'Unknown School',
    delivery_type: row.delivery_method,
    order_status: row.status,
    embroidery_status: 'PENDING',
    items: (row.order_items || []).map((i: any) => ({
      id: i.id,
      product_name: i.name,
      sku: i.sku,
      quantity: i.quantity,
      size: i.size || undefined,
      requires_embroidery: i.requires_embroidery,
      embroidery_status: i.embroidery_status === 'DONE' ? 'DONE' : 'PENDING',
      unit_price: i.unit_price != null ? Number(i.unit_price) : undefined,
      sent_quantity: i.sent_quantity != null ? Number(i.sent_quantity) : 0,
      nickname: i.nickname ?? undefined,
    })),
    created_at: row.created_at,
    paid_at: row.paid_at || row.created_at,
    meta: row.meta && typeof row.meta === 'object' ? row.meta : undefined,
    embroidery_done_at: row.embroidery_done_at || undefined,
    packed_at: row.packed_at || undefined,
    dispatched_at: row.dispatched_at || undefined,
    notes: row.notes || undefined,
    shipping_address: row.shipping_address,
  };
}

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  try {
    let query = supabaseAdmin
      .from('orders')
      .select(`*, schools (code, name), order_items (*)`)
      .ilike('order_number', 'BULK-%')
      .order('created_at', { ascending: false });

    if (session.role === 'school' && session.schoolCode) {
      const { data: school } = await supabaseAdmin
        .from('schools')
        .select('id')
        .eq('code', session.schoolCode.toUpperCase().trim())
        .maybeSingle();
      if (!school?.id) {
        return NextResponse.json([]);
      }
      query = query.eq('school_id', school.id);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Bulk orders API error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const orders = (data || []).map(mapOrder);
    return NextResponse.json(orders);
  } catch (err: any) {
    console.error('Bulk orders API error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to load orders' }, { status: 500 });
  }
}
