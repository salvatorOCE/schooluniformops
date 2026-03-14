import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { Proposal, ProposalStatus } from '@/lib/types';

const BUCKET = 'proposal-logos';
const TABLE = 'proposals';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB for logo

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
    };
}

/** POST /api/proposals/[id]/upload-logo — upload school logo and set proposal.logo_url */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
    }
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Proposal ID required' }, { status: 400 });
    }
    try {
        const contentType = req.headers.get('content-type') ?? '';
        let buffer: Buffer;
        let ext = 'png';

        if (contentType.includes('application/json')) {
            const body = (await req.json().catch(() => ({}))) as { base64?: string; dataUrl?: string };
            const data = body.dataUrl ?? body.base64;
            if (!data || typeof data !== 'string') {
                return NextResponse.json(
                    { error: 'Send JSON with base64 or dataUrl (image data)' },
                    { status: 400 }
                );
            }
            let b64 = data;
            if (data.startsWith('data:')) {
                const match = data.match(/^data:image\/(\w+);base64,(.+)$/);
                if (match) {
                    ext = match[1].toLowerCase() === 'jpeg' || match[1].toLowerCase() === 'jpg' ? 'jpg' : 'png';
                    b64 = match[2];
                } else {
                    b64 = data.replace(/^data:[^;]+;base64,/, '');
                }
            }
            buffer = Buffer.from(b64, 'base64');
        } else {
            const formData = await req.formData();
            const file = formData.get('file') as File | null;
            if (!file || !(file instanceof File)) {
                return NextResponse.json({ error: 'No file provided' }, { status: 400 });
            }
            const type = (file.type || '').toLowerCase();
            if (type.includes('jpeg') || type.includes('jpg')) ext = 'jpg';
            buffer = Buffer.from(await file.arrayBuffer());
        }

        if (buffer.length > MAX_SIZE_BYTES) {
            return NextResponse.json(
                { error: `Logo too large (max ${MAX_SIZE_BYTES / 1024 / 1024}MB)` },
                { status: 400 }
            );
        }
        if (buffer.length === 0) {
            return NextResponse.json({ error: 'Empty image' }, { status: 400 });
        }

        const path = `${id}.${ext}`;
        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(path, buffer, { upsert: true, contentType: ext === 'jpg' ? 'image/jpeg' : 'image/png' });
        if (uploadError) {
            console.error('Proposal logo upload error:', uploadError);
            return NextResponse.json({ error: uploadError.message || 'Upload failed' }, { status: 500 });
        }

        const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
        const { data: updated, error: updateError } = await supabaseAdmin
            .from(TABLE)
            .update({ logo_url: urlData.publicUrl, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (updateError) {
            console.error('Proposal logo_url update error:', updateError);
            return NextResponse.json({ error: updateError.message || 'Update failed' }, { status: 500 });
        }
        return NextResponse.json(mapRow(updated as Record<string, unknown>));
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
