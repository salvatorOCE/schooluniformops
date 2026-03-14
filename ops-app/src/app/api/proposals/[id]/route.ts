import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { Proposal, ProposalStatus } from '@/lib/types';

const TABLE = 'proposals';
const PROPOSAL_PDF_BUCKET = 'proposal-pdfs';

function mapRow(row: Record<string, unknown>): Proposal {
    return {
        id: String(row.id),
        school_id: row.school_id != null ? String(row.school_id) : null,
        school_name: String(row.school_name ?? ''),
        school_code: String(row.school_code ?? ''),
        title: String(row.title ?? ''),
        status: (row.status as ProposalStatus) || 'draft',
        pdf_url: row.pdf_url != null ? String(row.pdf_url) : null,
        logo_url: row.logo_url != null ? String(row.logo_url) : null,
        template_snapshot: (row.template_snapshot as Record<string, unknown>) ?? {},
        template_id: row.template_id != null ? String(row.template_id) : null,
        created_at: String(row.created_at),
        updated_at: String(row.updated_at),
        sent_at: row.sent_at != null ? String(row.sent_at) : null,
        reply_text: row.reply_text != null ? String(row.reply_text) : null,
        reply_at: row.reply_at != null ? String(row.reply_at) : null,
    };
}

/** PATCH /api/proposals/[id] — update a proposal */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Proposal ID required' }, { status: 400 });
    }
    try {
        const body = await req.json();
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (body.title !== undefined) updates.title = body.title;
        if (body.status !== undefined && ['draft', 'final', 'sent'].includes(body.status)) updates.status = body.status;
        if (body.pdf_url !== undefined) updates.pdf_url = body.pdf_url;
        if (body.logo_url !== undefined) updates.logo_url = body.logo_url;
        if (body.sent_at !== undefined) updates.sent_at = body.sent_at;
        if (body.reply_text !== undefined) updates.reply_text = body.reply_text;
        if (body.reply_at !== undefined) updates.reply_at = body.reply_at;

        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            console.error('Proposals update error:', error);
            return NextResponse.json({ error: error.message || 'Failed to update proposal' }, { status: 500 });
        }
        return NextResponse.json(mapRow(data as Record<string, unknown>));
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to update proposal' }, { status: 500 });
    }
}

/** GET /api/proposals/[id] — get one proposal */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Proposal ID required' }, { status: 400 });
    }
    try {
        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .single();
        if (error || !data) {
            return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
        }
        return NextResponse.json(mapRow(data as Record<string, unknown>));
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to fetch proposal' }, { status: 500 });
    }
}

/** DELETE /api/proposals/[id] — delete a proposal (and its PDF from storage if present) */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Proposal ID required' }, { status: 400 });
    }
    try {
        const { data: existing, error: fetchErr } = await supabaseAdmin
            .from(TABLE)
            .select('id, pdf_url')
            .eq('id', id)
            .single();
        if (fetchErr || !existing) {
            return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
        }
        const { error: deleteErr } = await supabaseAdmin.from(TABLE).delete().eq('id', id);
        if (deleteErr) {
            console.error('Proposals delete error:', deleteErr);
            return NextResponse.json({ error: deleteErr.message || 'Failed to delete proposal' }, { status: 500 });
        }
        const pdfUrl = (existing as { pdf_url?: string | null })?.pdf_url;
        if (pdfUrl && pdfUrl.includes(PROPOSAL_PDF_BUCKET)) {
            const path = `${id}.pdf`;
            await supabaseAdmin.storage.from(PROPOSAL_PDF_BUCKET).remove([path]);
        }
        return new NextResponse(null, { status: 204 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to delete proposal' }, { status: 500 });
    }
}
