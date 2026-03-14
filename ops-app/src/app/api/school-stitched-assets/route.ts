import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/** GET /api/school-stitched-assets?school_id=xxx — list stitched assets for a school */
export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  const schoolId = req.nextUrl.searchParams.get('school_id');
  if (!schoolId) {
    return NextResponse.json({ error: 'school_id required' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from('school_stitched_assets')
    .select(`
      id,
      school_id,
      manufacturer_garment_id,
      image_url,
      created_at,
      manufacturer_garments ( id, name, image_url )
    `)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
