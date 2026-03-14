import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { randomUUID } from 'crypto';

const BUCKET = 'manufacturer-garment-images';
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB for high-res

/** GET /api/manufacturer-garments — list all */
export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  const { data, error } = await supabaseAdmin
    .from('manufacturer_garments')
    .select('id, name, image_url, created_at, manufacturer_name, code, price, garment_type, extra')
    .order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

/** POST /api/manufacturer-garments — create (multipart: name + file) */
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  try {
    const formData = await req.formData();
    const name = (formData.get('name') as string | null)?.trim();
    const file = formData.get('file') as File | null;
    const manufacturer_name = (formData.get('manufacturer_name') as string | null)?.trim() || null;
    const code = (formData.get('code') as string | null)?.trim() || null;
    if (!name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_SIZE_BYTES / 1024 / 1024}MB)` },
        { status: 400 }
      );
    }
    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }
    const type = (file.type || '').toLowerCase();
    const ext = type.includes('jpeg') || type.includes('jpg') ? 'jpg' : 'png';
    const id = randomUUID();
    const path = `${id}.${ext}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: ext === 'jpg' ? 'image/jpeg' : 'image/png' });
    if (uploadError) {
      console.error('Manufacturer garment upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message || 'Upload failed' }, { status: 500 });
    }
    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const insertPayload: Record<string, unknown> = { id, name, image_url: urlData.publicUrl };
    if (manufacturer_name != null) insertPayload.manufacturer_name = manufacturer_name;
    if (code != null) insertPayload.code = code;
    const { data: row, error: insertError } = await supabaseAdmin
      .from('manufacturer_garments')
      .insert(insertPayload)
      .select('id, name, image_url, created_at, manufacturer_name, code')
      .single();
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
