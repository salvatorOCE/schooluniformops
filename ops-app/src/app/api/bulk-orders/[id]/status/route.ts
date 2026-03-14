/**
 * PATCH /api/bulk-orders/[id]/status — update only status.
 * Admin: any. School: only their school's orders (read-only for status; admin updates).
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromCookie } from '@/lib/session-server';

const BULK_STATUSES = ['Needs Ordering', 'Garments Ordered', 'Processing', 'Partial Completion', 'Partial Order Complete', 'Completed'];

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

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const status = typeof body.status === 'string' ? body.status.trim() : '';
  if (!status || !BULK_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Use one of: ${BULK_STATUSES.join(', ')}` }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from('orders')
    .select('id, school_id')
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

  const { error } = await supabaseAdmin.from('orders').update({ status: status }).eq('id', orderId);
  if (error) {
    console.error('Bulk order status update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status });
}
