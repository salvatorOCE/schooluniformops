/**
 * PATCH /api/schools/[id] — update school (e.g. xero_contact_id).
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'School ID required' }, { status: 400 });
  }

  let body: { xero_contact_id?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.xero_contact_id !== undefined) {
    updates.xero_contact_id = body.xero_contact_id === '' || body.xero_contact_id === null ? null : body.xero_contact_id;
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('schools')
    .update(updates)
    .eq('id', id)
    .select('id, code, name, xero_contact_id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
