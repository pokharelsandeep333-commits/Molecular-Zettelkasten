// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { rateLimit, isLimited, clientIp } from '../rateLimit';

afterEach(() => {
  vi.useRealTimers();
});

describe('rateLimit', () => {
  it('allows up to the limit, then blocks until the window resets', () => {
    vi.useFakeTimers();
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 1000).ok).toBe(true);
    const blocked = rateLimit(key, 3, 1000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);

    vi.advanceTimersByTime(1001);
    expect(rateLimit(key, 3, 1000).ok).toBe(true);
  });

  it('isLimited checks without counting a hit', () => {
    const key = `test-${Math.random()}`;
    expect(isLimited(key, 1).ok).toBe(true);
    expect(isLimited(key, 1).ok).toBe(true);
    rateLimit(key, 1, 60_000);
    expect(isLimited(key, 1).ok).toBe(false);
  });
});

describe('clientIp', () => {
  const req = (headers: Record<string, string>) => new Request('http://x', { headers });

  it('prefers X-Real-IP', () => {
    expect(clientIp(req({ 'x-real-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9' }))).toBe('1.2.3.4');
  });

  it('uses the last X-Forwarded-For hop, which the proxy appended', () => {
    expect(clientIp(req({ 'x-forwarded-for': 'spoofed, 5.6.7.8' }))).toBe('5.6.7.8');
  });

  it('falls back to "unknown"', () => {
    expect(clientIp(req({}))).toBe('unknown');
  });
});
