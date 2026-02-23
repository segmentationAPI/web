import { type NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export async function proxy(request: NextRequest) {
  const cookies = getSessionCookie(request);
  if (!cookies) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (public auth pages)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)',
  ],
};
