import { NextResponse } from 'next/server';
import { guard, SESSION_COOKIE } from '@/lib/firebase-admin';

// The cookie is only needed by /api/raw (images, PDFs), so scope it there.
const COOKIE_PATH = '/api/raw';

// Mirrors the caller's current ID token into an httpOnly cookie so the browser
// can load vault media via <img>/<iframe>, which cannot send headers.
export async function POST(req: Request) {
  const { user, response } = await guard(req);
  if (response) return response;

  const token = req.headers.get('Authorization')!.slice(7).trim();
  const maxAge = Math.max(0, user.exp - Math.floor(Date.now() / 1000));

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: COOKIE_PATH,
    maxAge,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { path: COOKIE_PATH, maxAge: 0 });
  return res;
}
