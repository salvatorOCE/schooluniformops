import { cookies } from 'next/headers';

const COOKIE_NAME = 'ops_session';

export type SessionRole = 'admin' | 'school' | null;

export interface SessionFromCookie {
  role: SessionRole;
  schoolCode: string | null;
  raw: string;
}

/**
 * Read ops_session cookie and return role/schoolCode. Returns null if no valid session.
 * Use in API routes that require auth; return 401 when null.
 */
export async function getSessionFromCookie(): Promise<SessionFromCookie | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value ?? '';

  if (!session) {
    return null;
  }

  if (session === 'ok' || session === 'admin') {
    return { role: 'admin', schoolCode: null, raw: session };
  }

  if (session.startsWith('school:')) {
    const schoolCode = session.slice(7).trim() || null;
    return { role: 'school', schoolCode, raw: session };
  }

  return null;
}
