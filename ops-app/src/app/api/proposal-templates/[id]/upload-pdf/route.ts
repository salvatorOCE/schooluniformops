import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { ProposalTemplate } from '@/lib/types';

const TEMPLATE_PDF_BUCKET = 'proposal-template-pdfs';
const MAX_SIZE_MB = 20;

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

/** POST /api/proposal-templates/[id]/upload-pdf — upload or replace PDF for this template */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
  }
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File too large (max ${MAX_SIZE_MB}MB)` }, { status: 400 });
    }
    const path = `${id}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(TEMPLATE_PDF_BUCKET)
      .upload(path, file, { upsert: true, contentType: 'application/pdf' });
    if (uploadError) {
      console.error('Template PDF upload error:', uploadError);
      return NextResponse.json({ error: (uploadError as { message?: string })?.message || 'Upload failed' }, { status: 500 });
    }
    const { data: urlData } = supabaseAdmin.storage.from(TEMPLATE_PDF_BUCKET).getPublicUrl(path);
    const { data, error } = await supabaseAdmin
      .from('proposal_templates')
      .update({ pdf_url: urlData.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) {
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }
    return NextResponse.json(mapRow(data as Record<string, unknown>));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
