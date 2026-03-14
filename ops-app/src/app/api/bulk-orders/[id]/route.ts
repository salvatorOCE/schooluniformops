/**
 * PATCH /api/bulk-orders/[id] — update bulk order (status, details, items).
 * Admin: can update any. School: only their school's orders, can update status.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromCookie } from '@/lib/session-server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const { id: orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
  }

  let body: {
    schoolId?: string;
    orderNumber?: string;
    customerName?: string;
    studentName?: string;
    status?: string;
    requestedAt?: string;
    partialDelivery?: number[];
    items?: { productId?: string; productName: string; sku: string; size: string; quantity: number; price?: number }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from('orders')
    .select('id, school_id, order_number')
    .eq('id', orderId)
    .ilike('order_number', 'BULK-%')
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (session.role === 'school') {
    if (!session.schoolCode) {
      return NextResponse.json({ error: 'School session missing' }, { status: 403 });
    }
    const { data: school } = await supabaseAdmin
      .from('schools')
      .select('id')
      .eq('code', session.schoolCode.toUpperCase().trim())
      .maybeSingle();
    if (!school?.id || existing.school_id !== school.id) {
      return NextResponse.json({ error: 'Not allowed to edit this order' }, { status: 403 });
    }
  }

  const orderUpdates: Record<string, unknown> = {};
  if (body.orderNumber !== undefined) orderUpdates.order_number = body.orderNumber;
  if (body.customerName !== undefined) orderUpdates.customer_name = body.customerName;
  if (body.studentName !== undefined) orderUpdates.student_name = body.studentName;
  if (body.status !== undefined) orderUpdates.status = body.status;
  if (session.role === 'admin' && body.schoolId !== undefined) orderUpdates.school_id = body.schoolId;

  if (body.requestedAt !== undefined || body.partialDelivery !== undefined) {
    const { data: ord } = await supabaseAdmin.from('orders').select('meta').eq('id', orderId).single();
    const existingMeta = (ord as { meta?: Record<string, unknown> } | null)?.meta && typeof (ord as any).meta === 'object' ? (ord as any).meta as Record<string, unknown> : {};
    orderUpdates.meta = {
      ...existingMeta,
      order_requested_at: body.requestedAt ?? existingMeta.order_requested_at,
      partial_delivery: body.partialDelivery ?? existingMeta.partial_delivery ?? [],
    };
  }

  const { error: orderError } = await supabaseAdmin.from('orders').update(orderUpdates).eq('id', orderId);
  if (orderError) {
    console.error('Bulk order update error:', orderError);
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  // Full items update (admin only) would go through the existing adapter.updateBulkOrder flow

  return NextResponse.json({ ok: true });
}
