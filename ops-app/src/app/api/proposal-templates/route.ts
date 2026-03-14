import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { ProposalTemplate } from '@/lib/types';

const TABLE = 'proposal_templates';
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

/** GET /api/proposal-templates — list all templates */
export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      const code = (error as { code?: string })?.code ?? '';
      const msg = (error as { message?: string })?.message ?? '';
      const tableMissing = code === '42P01' || /relation .* does not exist|undefined table/i.test(msg);
      if (tableMissing) return NextResponse.json([]);
      console.error('Proposal templates fetch error:', error);
      return NextResponse.json({ error: error.message || 'Failed to fetch templates' }, { status: 500 });
    }
    const list: ProposalTemplate[] = (data || []).map((row: Record<string, unknown>) => mapRow(row));
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

/** POST /api/proposal-templates — create a template (PDF-only).
 *  - JSON { name } only: create template and return signed upload credentials; client uploads file directly to Storage.
 *  - JSON { name, fileBase64 }: create template and upload (legacy; may hit body size limits).
 */
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  try {
    const contentType = req.headers.get('content-type') ?? '';
    let name = 'Untitled Template';
    let pdfBuffer: Buffer | null = null;
    let jsonBody: Record<string, unknown> = {};

    if (contentType.includes('application/json')) {
      jsonBody = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const nameVal = jsonBody.name;
      name = (typeof nameVal === 'string' && nameVal.trim()) ? nameVal.trim() : name;
      const fileBase64 = jsonBody.fileBase64;
      if (fileBase64 && typeof fileBase64 === 'string') {
        try {
          pdfBuffer = Buffer.from(fileBase64, 'base64');
        } catch {
          return NextResponse.json({ error: 'Invalid fileBase64' }, { status: 400 });
        }
        if (pdfBuffer.length > MAX_SIZE_MB * 1024 * 1024) {
          return NextResponse.json({ error: `File too large (max ${MAX_SIZE_MB}MB)` }, { status: 400 });
        }
      } else {
        // No file in body: create template and return signed upload URL so client can upload directly (avoids body/FormData limits)
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from(TABLE)
          .insert({ name, editor_state: {} })
          .select()
          .single();
        if (insertError || !inserted) {
          console.error('Proposal templates insert error:', insertError);
          return NextResponse.json({ error: (insertError as { message?: string })?.message || 'Failed to create template' }, { status: 500 });
        }
        const id = String((inserted as Record<string, unknown>).id);
        const path = `${id}.pdf`;
        const { data: signedData, error: signedError } = await supabaseAdmin.storage
          .from(TEMPLATE_PDF_BUCKET)
          .createSignedUploadUrl(path, { upsert: true });
        if (signedError || !signedData?.token) {
          await supabaseAdmin.from(TABLE).delete().eq('id', id);
          const msg = (signedError as { message?: string })?.message ?? 'Failed to create upload URL';
          return NextResponse.json({ error: msg }, { status: 500 });
        }
        const { data: urlData } = supabaseAdmin.storage.from(TEMPLATE_PDF_BUCKET).getPublicUrl(path);
        const { error: updateError } = await supabaseAdmin
          .from(TABLE)
          .update({ pdf_url: urlData.publicUrl, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (updateError) {
          await supabaseAdmin.from(TABLE).delete().eq('id', id);
          return NextResponse.json({ error: (updateError as { message?: string })?.message ?? 'Failed to save template' }, { status: 500 });
        }
        const row = { ...(inserted as Record<string, unknown>), pdf_url: urlData.publicUrl };
        const template = mapRow(row);
        return NextResponse.json({
          template,
          upload: { path, token: signedData.token },
        });
      }
    }

    if (pdfBuffer) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from(TABLE)
        .insert({ name, editor_state: {} })
        .select()
        .single();
      if (insertError || !inserted) {
        console.error('Proposal templates insert error:', insertError);
        return NextResponse.json({ error: (insertError as { message?: string })?.message || 'Failed to create template' }, { status: 500 });
      }
      const id = String((inserted as Record<string, unknown>).id);
      const path = `${id}.pdf`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(TEMPLATE_PDF_BUCKET)
        .upload(path, pdfBuffer, { upsert: true, contentType: 'application/pdf' });
      if (uploadError) {
        await supabaseAdmin.from(TABLE).delete().eq('id', id);
        const uploadMsg = (uploadError as { message?: string })?.message ?? 'Upload failed';
        const hint = /bucket|not found|resource/i.test(uploadMsg)
          ? ' Create the storage bucket by running the migration 20260309_proposal_templates_pdf_url.sql in Supabase SQL Editor.'
          : '';
        console.error('Template PDF upload error:', uploadError);
        return NextResponse.json({ error: uploadMsg + hint }, { status: 500 });
      }
      const { data: urlData } = supabaseAdmin.storage.from(TEMPLATE_PDF_BUCKET).getPublicUrl(path);
      const { error: updateError } = await supabaseAdmin
        .from(TABLE)
        .update({ pdf_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (updateError) {
        await supabaseAdmin.from(TABLE).delete().eq('id', id);
        const msg = (updateError as { message?: string })?.message ?? '';
        const hint = /column.*pdf_url|does not exist/i.test(msg)
          ? ' Run the migration that adds pdf_url to proposal_templates (20260309_proposal_templates_pdf_url.sql).'
          : '';
        return NextResponse.json(
          { error: msg + hint || 'Failed to save template PDF link' },
          { status: 500 }
        );
      }
      const { data: updated } = await supabaseAdmin.from(TABLE).select('*').eq('id', id).single();
      return NextResponse.json(mapRow((updated ?? inserted) as Record<string, unknown>));
    }

    return NextResponse.json(
      { error: 'Send JSON with name (and optionally fileBase64), or use the direct-upload flow: POST { name }, then upload file with the returned path and token.' },
      { status: 400 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create template';
    console.error('Proposal template create error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
