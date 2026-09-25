import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { NextResponse } from 'next/server';
import { isAllowedEmail } from './allowedEmails';
import { rateLimit, isLimited, clientIp, LIMITS } from './rateLimit';

// httpOnly cookie carrying the Firebase ID token, set by /api/session. It exists
// only so <img>/<iframe> requests to /api/raw can authenticate; JSON APIs use
// the Authorization header.
export const SESSION_COOKIE = 'mz_session';

// Lazy so `next build` does not need credentials.
function getAdminAuth() {
  if (!getApps().length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Firebase Admin credentials are not configured');
    }
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  return getAuth();
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function bearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() || null : null;
}

/**
 * Verify the caller's Firebase ID token (Authorization header, or the session
 * cookie when `allowCookie` is set) and that it belongs to an allowed, verified
 * email. Throws on any failure.
 */
export async function verifyAuth(req: Request, { allowCookie = false } = {}): Promise<DecodedIdToken> {
  const token = bearerToken(req) ?? (allowCookie ? readCookie(req, SESSION_COOKIE) : null);
  if (!token) throw new Error('Unauthorized');

  let decoded: DecodedIdToken;
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch (error) {
    console.error('Error verifying Firebase JWT:', error instanceof Error ? error.message : error);
    throw new Error('Unauthorized');
  }

  // email_verified blocks an unverified email/password account claiming the owner's address.
  if (!decoded.email_verified || !isAllowedEmail(decoded.email)) {
    console.warn('Rejected token for non-allowlisted or unverified account');
    throw new Error('Unauthorized');
  }
  return decoded;
}

type Limit = { limit: number; windowMs: number };

/**
 * Authenticate and rate-limit an API request. Returns the decoded token, or a
 * ready-to-send error response.
 */
export async function guard(
  req: Request,
  { limit = LIMITS.general as Limit, allowCookie = false } = {},
): Promise<{ user: DecodedIdToken; response?: never } | { user?: never; response: NextResponse }> {
  const failKey = `authfail:${clientIp(req)}`;
  const blocked = isLimited(failKey, LIMITS.authFailure.limit);
  if (!blocked.ok) return { response: tooMany(blocked.retryAfterSec) };

  let user: DecodedIdToken;
  try {
    user = await verifyAuth(req, { allowCookie });
  } catch {
    rateLimit(failKey, LIMITS.authFailure.limit, LIMITS.authFailure.windowMs);
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const usage = rateLimit(`${limit.limit}/${limit.windowMs}:${user.uid}`, limit.limit, limit.windowMs);
  if (!usage.ok) return { response: tooMany(usage.retryAfterSec) };
  return { user };
}

export function tooMany(retryAfterSec: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please slow down.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
  );
}
