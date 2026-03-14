import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const BUCKET = 'school-logos';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/** POST /api/schools/[id]/upload-logo — upload school logo and set schools.logo_url */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'School ID required' }, { status: 400 });
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
      console.error('School logo upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message || 'Upload failed' }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('schools')
      .update({ logo_url: urlData.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, code, name, logo_url, updated_at')
      .single();
    if (updateError) {
      console.error('School logo_url update error:', updateError);
      return NextResponse.json({ error: updateError.message || 'Update failed' }, { status: 500 });
    }
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
