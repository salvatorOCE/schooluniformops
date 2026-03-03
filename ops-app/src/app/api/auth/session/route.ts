import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'ops_session';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value ?? '';

  if (!session) {
    return NextResponse.json({ role: null, schoolCode: null });
  }

  // Legacy: "ok" was the old admin cookie value
  if (session === 'ok' || session === 'admin') {
    return NextResponse.json({ role: 'admin', schoolCode: null });
  }

  if (session.startsWith('school:')) {
    const schoolCode = session.slice(7); // "school:WARRADALE" -> WARRADALE
    return NextResponse.json({ role: 'school', schoolCode });
  }

  return NextResponse.json({ role: null, schoolCode: null });
}
