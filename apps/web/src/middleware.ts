import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_AUTH = 'samachat-auth';
const COOKIE_MEMBERSHIP = 'samachat-membership';
const COOKIE_LEGAL = 'samachat-legal';

function isEnabled(value: string | undefined) {
  return value === '1';
}

export function middleware(request: NextRequest) {
  const auth = isEnabled(request.cookies.get(COOKIE_AUTH)?.value);
  const membership = isEnabled(request.cookies.get(COOKIE_MEMBERSHIP)?.value);
  const legal = isEnabled(request.cookies.get(COOKIE_LEGAL)?.value);

  const url = request.nextUrl.clone();

  if (!auth) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (!membership) {
    url.pathname = '/onboarding/tenant';
    return NextResponse.redirect(url);
  }

  if (!legal) {
    url.pathname = '/onboarding/legal';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
