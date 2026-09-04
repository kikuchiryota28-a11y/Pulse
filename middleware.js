import { NextResponse } from 'next/server';

export function middleware(request) {
  const url = request.nextUrl.clone();
  const pulseId = url.searchParams.get('pulse');

  if (request.nextUrl.pathname === '/' && pulseId) {
    url.pathname = `/pulse/${encodeURIComponent(pulseId)}`;
    url.searchParams.delete('pulse');
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/pulse/:path*'],
};
