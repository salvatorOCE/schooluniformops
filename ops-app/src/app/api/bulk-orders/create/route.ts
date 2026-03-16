/**
 * POST /api/bulk-orders/create — create a bulk order.
 * Admin: can specify any school. School: must use their own school.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromCookie } from '@/lib/session-server';

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
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

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: 'At least one item required' }, { status: 400 });
  }

  let schoolId: string;
  const orderSource: 'admin' | 'school' = session.role === 'school' ? 'school' : 'admin';

  if (session.role === 'school') {
    if (!session.schoolCode) {
      return NextResponse.json({ error: 'School session missing' }, { status: 403 });
    }
    const { data: school } = await supabaseAdmin
      .from('schools')
      .select('id')
      .eq('code', session.schoolCode.toUpperCase().trim())
      .maybeSingle();
    if (!school?.id) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    schoolId = school.id;
  } else {
    if (!body.schoolId?.trim()) {
      return NextResponse.json({ error: 'schoolId required' }, { status: 400 });
    }
    schoolId = body.schoolId.trim();
  }

  const { data: school } = await supabaseAdmin.from('schools').select('name, code').eq('id', schoolId).single();
  const fakeWooId = -(Date.now() % 2147483648);
  const bulkOrderNumber = body.orderNumber || `BULK-${school?.code || schoolId.substring(0, 4).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

  const defaultStatus = body.status || 'Needs Ordering';
  const meta: Record<string, unknown> = {
    order_source: orderSource,
    status_changes: [{ status: defaultStatus, at: new Date().toISOString() }],
  };
  if (body.requestedAt) meta.order_requested_at = body.requestedAt;
  if (body.partialDelivery && body.partialDelivery.length > 0) meta.partial_delivery = body.partialDelivery;

  const { data: insertedOrder, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      woo_order_id: fakeWooId,
      order_number: bulkOrderNumber,
      status: defaultStatus,
      customer_name: body.customerName || 'School Admin',
      student_name: body.studentName || 'BULK_STOCK',
      school_id: schoolId,
      delivery_method: 'SCHOOL',
      meta,
    })
    .select('id')
    .single();

  if (orderError) {
    console.error('Bulk order create error:', orderError);
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  const orderItemsToInsert = items.map((item) => ({
    order_id: insertedOrder.id,
    product_id: item.productId || null,
    name: item.productName,
    sku: item.sku,
    quantity: item.quantity,
    size: item.size || null,
    requires_embroidery: false,
    unit_price: item.price ?? 0,
  }));

  const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItemsToInsert);
  if (itemsError) {
    console.error('Bulk order items error:', itemsError);
    await supabaseAdmin.from('orders').delete().eq('id', insertedOrder.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ id: insertedOrder.id, order_number: bulkOrderNumber });
}
