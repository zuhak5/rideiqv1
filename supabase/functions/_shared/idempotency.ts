import { getRedis, redisGet, setJson } from './redis.ts';

function sanitizePart(v: string): string {
  // Keep keys compact and predictable (Redis free tier).
  // NOTE: do not use ':' inside parts so joins stay unambiguous.
  return v
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

export function buildIdempotencyKey(parts: string[]): string {
  const safe = (Array.isArray(parts) ? parts : [])
    .map((p) => sanitizePart(String(p ?? '')))
    .filter(Boolean);
  return safe.join(':');
}

export async function getIdempotentResponse<T = any>(key: string): Promise<T | null> {
  // Fail-open if Redis is not configured/unavailable.
  if (!getRedis()) return null;
  try {
    const raw = await redisGet(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setIdempotentResponse(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  // Fail-open if Redis is not configured/unavailable.
  if (!getRedis()) return;
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return;
  try {
    await setJson(key, value, ttlSeconds);
  } catch {
    // ignore
  }
}

