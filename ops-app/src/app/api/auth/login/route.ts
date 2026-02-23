import { NextResponse } from 'next/server';

const LOGIN_CODE = process.env.LOGIN_CODE || 'sus123';
const COOKIE_NAME = 'ops_session';
const COOKIE_VALUE = 'ok';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (code !== LOGIN_CODE) {
      return NextResponse.json(
        { error: 'Invalid code' },
        { status: 401 }
      );
    }
    const res = NextResponse.json({ success: true });
    res.cookies.set(COOKIE_NAME, COOKIE_VALUE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
