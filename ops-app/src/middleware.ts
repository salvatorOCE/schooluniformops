import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'ops_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page, auth API, and WooCommerce webhooks (no session)
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/webhooks/')
  ) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get(COOKIE_NAME)?.value;

  // Allow API routes for authenticated users (school users need order-details, product-images, etc.)
  if (pathname.startsWith('/api/') && session) {
    return NextResponse.next();
  }

  // School users (non-admin): only allow Orders, Recovery Center, Product list
  const schoolAllowed = ['/orders', '/exceptions', '/products'];
  if (session?.startsWith('school:')) {
    if (pathname === '/' || pathname === '/school-portal') {
      return NextResponse.redirect(new URL('/orders', request.url));
    }
    if (schoolAllowed.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/orders', request.url));
  }

  // No session: redirect to login
  if (!session || (session !== 'ok' && session !== 'admin')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
