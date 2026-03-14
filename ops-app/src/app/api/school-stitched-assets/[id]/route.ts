import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const BUCKET = 'school-stitched-assets';

/** DELETE /api/school-stitched-assets/[id] — remove one stitched asset for a school */
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
    .from('school_stitched_assets')
    .select('id, school_id')
    .eq('id', id)
    .single();

  if (fetchError || !row) {
    return NextResponse.json({ error: fetchError?.message ?? 'Not found' }, { status: fetchError?.code === 'PGRST116' ? 404 : 500 });
  }

  const schoolId = (row as { school_id: string }).school_id;
  if (schoolId) {
    const path = `${schoolId}/${id}.png`;
    await supabaseAdmin.storage.from(BUCKET).remove([path]);
  }

  const { error: deleteError } = await supabaseAdmin
    .from('school_stitched_assets')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
