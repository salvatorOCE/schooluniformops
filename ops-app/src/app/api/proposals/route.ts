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

/** GET /api/proposals — list all proposals */
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
            if (tableMissing) {
                return NextResponse.json([]);
            }
            console.error('Proposals fetch error:', error);
            return NextResponse.json({ error: error.message || 'Failed to fetch proposals' }, { status: 500 });
        }
        const list: Proposal[] = (data || []).map((row: Record<string, unknown>) => mapRow(row));
        return NextResponse.json(list);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to fetch proposals' }, { status: 500 });
    }
}

/** POST /api/proposals — create a proposal (school + template; template PDF is copied to proposal). */
export async function POST(req: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    try {
        const body = await req.json();
        const {
            school_id,
            school_name,
            school_code,
            title,
            status,
            template_id,
            sent_at,
        } = body as Partial<Proposal>;
        if (!template_id || typeof template_id !== 'string') {
            return NextResponse.json({ error: 'template_id is required' }, { status: 400 });
        }
        const schoolName = typeof school_name === 'string' ? school_name.trim() : '';
        const schoolCode = typeof school_code === 'string' ? school_code.trim() : '';
        if (!schoolName || !schoolCode) {
            return NextResponse.json({ error: 'school_name and school_code are required' }, { status: 400 });
        }
        const { data: templateRow, error: templateErr } = await supabaseAdmin
            .from('proposal_templates')
            .select('pdf_url')
            .eq('id', template_id)
            .single();
        if (templateErr || !templateRow) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }
        const templatePdfUrl = (templateRow as { pdf_url?: string } | null)?.pdf_url;
        if (!templatePdfUrl) {
            return NextResponse.json({ error: 'Template has no PDF; upload a PDF to the template first' }, { status: 400 });
        }
        const effectiveTitle = typeof title === 'string' && title.trim() ? title.trim() : `Uniform Proposal for ${schoolName}`;
        const payload = {
            school_id: school_id || null,
            school_name: schoolName,
            school_code: schoolCode,
            title: effectiveTitle,
            status: status && ['draft', 'final', 'sent'].includes(status) ? status : 'draft',
            pdf_url: null as string | null,
            template_snapshot: {},
            template_id,
            sent_at: sent_at || null,
        };
        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .insert(payload)
            .select()
            .single();
        if (error) {
            console.error('Proposals insert error:', error);
            return NextResponse.json({ error: error.message || 'Failed to create proposal' }, { status: 500 });
        }
        const proposal = mapRow(data as Record<string, unknown>);
        const newId = proposal.id;

        try {
            const res = await fetch(templatePdfUrl);
            if (res.ok) {
                const buf = await res.arrayBuffer();
                const path = `${newId}.pdf`;
                const { error: uploadErr } = await supabaseAdmin.storage
                    .from(PROPOSAL_PDF_BUCKET)
                    .upload(path, buf, { upsert: true, contentType: 'application/pdf' });
                if (!uploadErr) {
                    const { data: urlData } = supabaseAdmin.storage.from(PROPOSAL_PDF_BUCKET).getPublicUrl(path);
                    await supabaseAdmin
                        .from(TABLE)
                        .update({ pdf_url: urlData.publicUrl, updated_at: new Date().toISOString() })
                        .eq('id', newId);
                    proposal.pdf_url = urlData.publicUrl;
                }
            }
        } catch (e) {
            console.warn('Copy template PDF to proposal failed:', e);
        }

        return NextResponse.json(proposal);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 });
    }
}
