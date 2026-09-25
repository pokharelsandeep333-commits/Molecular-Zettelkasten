import { NextRequest, NextResponse } from 'next/server';

// Firebase Auth (popup sign-in) loads scripts from apis.google.com and frames the
// auth domain; Firestore and token refresh talk to *.googleapis.com. Notes embed
// external images (badges, diagrams) and YouTube videos (no-cookie player).
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const authOrigin = authDomain ? `https://${authDomain}` : '';

function buildCsp(nonce: string) {
  const isDev = process.env.NODE_ENV === 'development';
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://apis.google.com${isDev ? " 'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https:;
    font-src 'self' data:;
    connect-src 'self' https://*.googleapis.com https://apis.google.com ${authOrigin};
    frame-src 'self' https://*.firebaseapp.com https://*.web.app https://accounts.google.com https://apis.google.com https://www.youtube-nocookie.com ${authOrigin};
    worker-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    ${isDev ? '' : 'upgrade-insecure-requests;'}
  `.replace(/\s{2,}/g, ' ').trim();
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);

  // Next.js reads the nonce from the request's CSP header and stamps it on its scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: API routes set their own headers, static assets need no CSP.
      source: '/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
