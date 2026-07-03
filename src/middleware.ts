import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/coach/:path*',
    '/feedback/:path*',
    '/help/:path*',
    '/profile/:path*',
    '/roadmap/:path*',
    '/forgot-password',
    '/sign-in',
    '/sign-up',
    '/',
    '/verify/:path*',
    '/admin/:path*',
  ],
};

// Authenticated app sections (require a signed-in user).
const PROTECTED_PREFIXES = ['/dashboard', '/coach', '/feedback', '/help', '/profile', '/roadmap'];

export async function middleware(request: NextRequest) {
  // const token = await getToken({ req: request }) || request.cookies.get("token")?.value || "";
  const url = request.nextUrl;
  const token = await getToken({ req: request })
  // console.log("token", token )

  // Redirect to dashboard if the user is already authenticated
  // and trying to access sign-in, sign-up, or home page
  if (
    token &&
    (url.pathname.startsWith('/sign-in') ||
      url.pathname.startsWith('/sign-up') ||
      url.pathname.startsWith('/verify') ||
      url.pathname.startsWith('/forgot-password') ||
      url.pathname === '/')
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!token && PROTECTED_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // Admin area: must be signed in AND have the admin role.
  if (url.pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
    if ((token as any).role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}