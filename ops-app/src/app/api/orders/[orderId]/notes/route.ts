import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveOrderUuid } from '@/lib/woo-utils';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'ops_session';

async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value ?? '';
  if (!session) return { role: null as string | null, schoolCode: null as string | null };
  if (session === 'ok' || session === 'admin') return { role: 'admin', schoolCode: null };
  if (session.startsWith('school:')) return { role: 'school', schoolCode: session.slice(7) };
  return { role: null, schoolCode: null };
}

/** GET /api/orders/[orderId]/notes - List notes for an order */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  if (!supabaseAdmin) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  const orderUuid = await resolveOrderUuid(orderId);
  if (!orderUuid) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from('order_notes')
    .select('id, author_role, author_display, content, created_at')
    .eq('order_id', orderUuid)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Order notes fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notes: data || [] });
}

/** POST /api/orders/[orderId]/notes - Create a note */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  if (!supabaseAdmin) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  const session = await getSession();
  if (!session.role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });

  const orderUuid = await resolveOrderUuid(orderId);
  if (!orderUuid) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const authorDisplay = session.role === 'school' && session.schoolCode
    ? session.schoolCode
    : session.role === 'admin'
      ? 'Admin'
      : session.role;

  const { data, error } = await supabaseAdmin
    .from('order_notes')
    .insert({
      order_id: orderUuid,
      author_role: session.role,
      author_display: authorDisplay,
      content,
    })
    .select('id, author_role, author_display, content, created_at')
    .single();

  if (error) {
    console.error('Order note create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ note: data });
}
