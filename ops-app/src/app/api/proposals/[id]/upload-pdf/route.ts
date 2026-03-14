import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const BUCKET = 'proposal-pdfs';
const MAX_SIZE_MB = 20;

/** POST /api/proposals/[id]/upload-pdf — upload PDF for a proposal and set pdf_url */
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
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(path, file, { upsert: true, contentType: 'application/pdf' });
        if (uploadError) {
            console.error('Proposal PDF upload error:', uploadError);
            return NextResponse.json({ error: uploadError.message || 'Upload failed' }, { status: 500 });
        }
        const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(uploadData.path);
        await supabaseAdmin
            .from('proposals')
            .update({ pdf_url: urlData.publicUrl, updated_at: new Date().toISOString() })
            .eq('id', id);
        return NextResponse.json({ pdf_url: urlData.publicUrl });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
