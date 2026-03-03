import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase Admin not configured' }, { status: 500 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { id, status, notes } = body as { id?: string; status?: string; notes?: string };

    if (!id || (!status && notes === undefined)) {
      return NextResponse.json({ error: 'Missing id or update fields' }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {};
    if (status) updatePayload.status = status;
    if (notes !== undefined) updatePayload.notes = notes;

    const { error } = await supabaseAdmin
      .from('fix_ups')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.error('Admin fix_up update error:', error);
      return NextResponse.json({ error: error.message || 'Failed to update fix-up' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Fix-up update API error:', e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

