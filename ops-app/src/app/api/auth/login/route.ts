import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';

const LOGIN_CODE = process.env.LOGIN_CODE || 'sus123';
const COOKIE_NAME = 'ops_session';
const COOKIE_ADMIN = 'admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const password = typeof body?.password === 'string' ? body.password.trim() : '';
    const value = code || password;

    if (!value) {
      return NextResponse.json({ error: 'Enter your access code or school password' }, { status: 401 });
    }

    // Admin: single input matches LOGIN_CODE (env only; do not use DB for admin)
    if (value === LOGIN_CODE) {
      const res = NextResponse.json({ success: true, role: 'admin' });
      // Do not set domain so cookie is scoped to current host (e.g. schooluniformops.netlify.app)
      res.cookies.set(COOKIE_NAME, COOKIE_ADMIN, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return res;
    }

    // School portal: lookup by password in DB (hashed per school)
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { data: rows, error } = await supabaseAdmin
      .from('school_ops_credentials')
      .select('password_hash, schools!inner(code)')
      .limit(500);

    if (error) {
      console.error('Login school_ops_credentials lookup failed:', error.message);
      return NextResponse.json({ error: 'Invalid code or password' }, { status: 401 });
    }

    for (const row of rows || []) {
      const credential = row as { password_hash: string; schools: { code: string } | { code: string }[] | null };
      const school = Array.isArray(credential.schools) ? credential.schools[0] : credential.schools;
      const schoolCode = school?.code;
      if (!schoolCode) continue;
      const match = await bcrypt.compare(value, credential.password_hash);
      if (match) {
        const res = NextResponse.json({ success: true, role: 'school', schoolCode });
        // Do not set domain so cookie is scoped to current host (e.g. schooluniformops.netlify.app)
        res.cookies.set(COOKIE_NAME, `school:${schoolCode}`, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
        return res;
      }
    }

    return NextResponse.json({ error: 'Invalid code or password' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
