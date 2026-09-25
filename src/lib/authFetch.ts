import { auth } from './firebase';

/** fetch() with the signed-in user's Firebase ID token attached (refreshed by the SDK when stale). */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const user = auth?.currentUser;
  if (user) headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  return fetch(input, { ...init, headers });
}

/** authFetch + JSON parsing that throws on non-2xx responses with the server's error message. */
export async function authFetchJson<T>(input: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(input, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}
