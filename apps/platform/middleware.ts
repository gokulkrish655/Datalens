import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/pending',
  '/api/auth',
  '/api/auth/lookup-domain',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/impersonate',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow Next.js internals
  if (pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Not authenticated → redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User is pending approval → redirect to pending page
  if (token.status === 'PENDING' && pathname !== '/pending') {
    return NextResponse.redirect(new URL('/pending', request.url));
  }

  // Tenant is inactive → sign out
  if (token.tenantIsActive === false) {
    return NextResponse.redirect(new URL('/login?error=TenantInactive', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};