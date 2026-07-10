import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Skip middleware for certain paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Skip files
  ) {
    return NextResponse.next();
  }

  // Simple redirect: / → /home
  if (pathname === '/') {
    // Use forwarded headers to get the correct host (behind reverse proxy)
    const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'arata.co.kr';
    const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
    const redirectUrl = new URL('/home', `${forwardedProto}://${forwardedHost}`);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|api|favicon.ico|uploads|static).*)',
  ],
};