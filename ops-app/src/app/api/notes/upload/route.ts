import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const BUCKET = 'note-attachments';
const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(req: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
    }
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        if (!file || !(file instanceof File)) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            return NextResponse.json({ error: `File too large (max ${MAX_SIZE_MB}MB)` }, { status: 400 });
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, GIF or WebP.' }, { status: 400 });
        }
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { data, error } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(path, file, { upsert: false, contentType: file.type });
        if (error) {
            if (error.message?.includes('Bucket not found') || error.message?.includes('does not exist')) {
                return NextResponse.json(
                    { error: `Storage bucket "${BUCKET}" not found. Create a public bucket named "note-attachments" in Supabase Dashboard > Storage.` },
                    { status: 502 }
                );
            }
            console.error('Upload error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(data.path);
        return NextResponse.json({ url: urlData.publicUrl });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
