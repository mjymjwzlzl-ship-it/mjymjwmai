import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SAMGUKJI_BYEONGUI_CANONICAL_ID = 'cmhcw1u3d0000wcdwylb39b6i';
const SAMGUKJI_BYEONGUI_DUPLICATE_ID = 'cmredautv0000c4oz2a1637sl';
const HIGH_SCHOOL_SUMMIT_SEASON_2_ID = 'cmred6jg00000t74honsbjxk1';

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

  if (pathname.startsWith(`/webtoons/${SAMGUKJI_BYEONGUI_DUPLICATE_ID}`)) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = pathname.replace(
      `/webtoons/${SAMGUKJI_BYEONGUI_DUPLICATE_ID}`,
      `/webtoons/${SAMGUKJI_BYEONGUI_CANONICAL_ID}`,
    );
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith(`/webtoons/${HIGH_SCHOOL_SUMMIT_SEASON_2_ID}`)) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/daily';
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|api|favicon.ico|uploads|static).*)',
  ],
};
