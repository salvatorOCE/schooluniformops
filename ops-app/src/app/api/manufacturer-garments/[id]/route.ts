import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const BUCKET = 'manufacturer-garment-images';

/** GET /api/manufacturer-garments/[id] — single garment (for edit form) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from('manufacturer_garments')
    .select('id, name, image_url, created_at, manufacturer_name, code, price, garment_type, extra')
    .eq('id', id)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: error?.code === 'PGRST116' ? 404 : 500 });
  }
  return NextResponse.json(data);
}

/** PATCH /api/manufacturer-garments/[id] — update garment fields */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }
  let body: {
    name?: string;
    manufacturer_name?: string | null;
    code?: string | null;
    price?: number | null;
    garment_type?: string | null;
    extra?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.manufacturer_name !== undefined) updates.manufacturer_name = body.manufacturer_name === '' || body.manufacturer_name === null ? null : body.manufacturer_name;
  if (body.code !== undefined) updates.code = body.code === '' || body.code === null ? null : body.code;
  if (body.price !== undefined) updates.price = body.price === '' || body.price === null ? null : Number(body.price);
  if (body.garment_type !== undefined) updates.garment_type = body.garment_type === '' || body.garment_type === null ? null : body.garment_type;
  if (body.extra !== undefined) updates.extra = body.extra && typeof body.extra === 'object' ? body.extra : {};
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from('manufacturer_garments')
    .update(updates)
    .eq('id', id)
    .select('id, name, image_url, created_at, manufacturer_name, code, price, garment_type, extra')
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

/** Extract storage path from Supabase public URL (bucket name + path). */
function storagePathFromPublicUrl(bucket: string, publicUrl: string): string | null {
  try {
    const pathname = new URL(publicUrl).pathname;
    const prefix = `/storage/v1/object/public/${bucket}/`;
    if (pathname.startsWith(prefix)) return pathname.slice(prefix.length);
    return null;
  } catch {
    return null;
  }
}

/** DELETE /api/manufacturer-garments/[id] — delete row and remove image file from storage */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }
  const { data: row, error: fetchError } = await supabaseAdmin
    .from('manufacturer_garments')
    .select('id, image_url')
    .eq('id', id)
    .single();
  if (fetchError || !row) {
    return NextResponse.json({ error: fetchError?.message ?? 'Not found' }, { status: fetchError?.code === 'PGRST116' ? 404 : 500 });
  }
  if (row.image_url) {
    const path = storagePathFromPublicUrl(BUCKET, row.image_url);
    if (path) {
      await supabaseAdmin.storage.from(BUCKET).remove([path]);
    }
  }
  const { error } = await supabaseAdmin
    .from('manufacturer_garments')
    .delete()
    .eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
