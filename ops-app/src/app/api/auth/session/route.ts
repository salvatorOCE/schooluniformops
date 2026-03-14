import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

const COOKIE_NAME = 'ops_session';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value ?? '';

  if (!session) {
    return NextResponse.json({ role: null, schoolCode: null, schoolId: null });
  }

  // Legacy: "ok" was the old admin cookie value
  if (session === 'ok' || session === 'admin') {
    return NextResponse.json({ role: 'admin', schoolCode: null, schoolId: null });
  }

  if (session.startsWith('school:')) {
    const schoolCode = session.slice(7).trim(); // "school:WARRADALE" -> WARRADALE
    let schoolId: string | null = null;
    if (schoolCode && supabaseAdmin) {
      const { data: school } = await supabaseAdmin
        .from('schools')
        .select('id')
        .eq('code', schoolCode.toUpperCase())
        .maybeSingle();
      schoolId = school?.id ?? null;
    }
    return NextResponse.json({ role: 'school', schoolCode: schoolCode || null, schoolId });
  }

  return NextResponse.json({ role: null, schoolCode: null, schoolId: null });
}
