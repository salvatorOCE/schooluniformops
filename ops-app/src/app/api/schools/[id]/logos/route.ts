import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { randomUUID } from 'crypto';

const BUCKET = 'school-logos';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export type SchoolLogo = { id: string; label: string; image_url: string; created_at?: string };

/** GET /api/schools/[id]/logos — list logos for school. Includes legacy school.logo_url if no school_logos rows. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  const { id: schoolId } = await params;
  if (!schoolId) {
    return NextResponse.json({ error: 'School ID required' }, { status: 400 });
  }
  const { data: rows, error } = await supabaseAdmin
    .from('school_logos')
    .select('id, label, image_url, created_at')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (rows && rows.length > 0) {
    return NextResponse.json(rows as SchoolLogo[]);
  }
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('logo_url')
    .eq('id', schoolId)
    .single();
  const legacyUrl = (school as { logo_url?: string | null } | null)?.logo_url;
  if (legacyUrl?.trim()) {
    return NextResponse.json([
      { id: 'legacy', label: 'Standard', image_url: legacyUrl } as SchoolLogo,
    ]);
  }
  return NextResponse.json([]);
}

/** POST /api/schools/[id]/logos — add logo (multipart: label + file) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  const { id: schoolId } = await params;
  if (!schoolId) {
    return NextResponse.json({ error: 'School ID required' }, { status: 400 });
  }
  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: 'Form data required' }, { status: 400 });
  }
  const label = (formData.get('label') as string | null)?.trim();
  const file = formData.get('file') as File | null;
  if (!label) {
    return NextResponse.json({ error: 'label required' }, { status: 400 });
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
  const ext = (file.type || '').toLowerCase().includes('jpeg') || (file.type || '').toLowerCase().includes('jpg') ? 'jpg' : 'png';
  const logoId = randomUUID();
  const path = `${schoolId}/${logoId}.${ext}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: ext === 'jpg' ? 'image/jpeg' : 'image/png' });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message || 'Upload failed' }, { status: 500 });
  }
  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  const { data: row, error: insertError } = await supabaseAdmin
    .from('school_logos')
    .insert({ id: logoId, school_id: schoolId, label, image_url: urlData.publicUrl })
    .select('id, label, image_url, created_at')
    .single();
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  return NextResponse.json(row as SchoolLogo);
}
