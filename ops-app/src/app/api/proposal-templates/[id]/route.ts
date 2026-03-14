import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { ProposalTemplate } from '@/lib/types';

const TABLE = 'proposal_templates';

function mapRow(row: Record<string, unknown>): ProposalTemplate {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    editor_state: (row.editor_state as Record<string, unknown>) ?? {},
    pdf_url: row.pdf_url != null ? String(row.pdf_url) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/** GET /api/proposal-templates/[id] — get one template */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
  }
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json(mapRow(data as Record<string, unknown>));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

/** PATCH /api/proposal-templates/[id] — update a template */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
  }
  try {
    const body = await req.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name;

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Proposal templates update error:', error);
      return NextResponse.json({ error: error.message || 'Failed to update template' }, { status: 500 });
    }
    return NextResponse.json(mapRow(data as Record<string, unknown>));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

/** DELETE /api/proposal-templates/[id] — delete a template */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
  }
  try {
    const { error } = await supabaseAdmin.from(TABLE).delete().eq('id', id);
    if (error) {
      console.error('Proposal templates delete error:', error);
      return NextResponse.json({ error: error.message || 'Failed to delete template' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
