import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const BUCKET = 'school-logos';

/** DELETE /api/schools/[id]/logos/[logoId] — delete logo row and remove file from storage */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; logoId: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  const { id: schoolId, logoId } = await params;
  if (!schoolId || !logoId) {
    return NextResponse.json({ error: 'School ID and logo ID required' }, { status: 400 });
  }
  if (logoId === 'legacy') {
    return NextResponse.json({ error: 'Cannot delete legacy logo; add a new logo first.' }, { status: 400 });
  }
  const { data: row, error: fetchError } = await supabaseAdmin
    .from('school_logos')
    .select('id, image_url')
    .eq('id', logoId)
    .eq('school_id', schoolId)
    .single();
  if (fetchError || !row) {
    return NextResponse.json({ error: 'Logo not found' }, { status: 404 });
  }
  const url = (row as { image_url: string }).image_url;
  try {
    const pathname = new URL(url).pathname;
    const prefix = `/storage/v1/object/public/${BUCKET}/`;
    if (pathname.startsWith(prefix)) {
      const path = pathname.slice(prefix.length);
      await supabaseAdmin.storage.from(BUCKET).remove([path]);
    }
  } catch {
    // ignore parse/storage errors
  }
  const { error } = await supabaseAdmin
    .from('school_logos')
    .delete()
    .eq('id', logoId)
    .eq('school_id', schoolId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
