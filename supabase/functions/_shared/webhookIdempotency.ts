import { getRedis, redisExpire, redisSetNxEx, releaseLock } from './redis.ts';

type ClaimResult =
  | { kind: 'unavailable' }
  | { kind: 'duplicate' }
  | { kind: 'claimed'; key: string; token: string; doneTtlSeconds: number };

function envPositiveInt(name: string, fallback: number, bounds: { min: number; max: number }): number {
  const raw = (Deno.env.get(name) ?? '').trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(bounds.min, Math.min(bounds.max, Math.trunc(n)));
}

function makeKey(providerCode: string, providerEventId: string): string {
  return `rideiq:idem:webhook:${providerCode}:${providerEventId}`;
}

function makeToken(): string {
  try {
    return crypto.randomUUID().replace(/-/g, '');
  } catch {
    return `${Date.now()}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
  }
}

export async function claimWebhookIdempotency(params: {
  providerCode: string;
  providerEventId: string;
}): Promise<ClaimResult> {
  // Fail-open: Redis is an accelerator, not the source of truth.
  if (!getRedis()) return { kind: 'unavailable' };

  const inflightTtlSeconds = envPositiveInt('REDIS_WEBHOOK_INFLIGHT_TTL_SECONDS', 30, { min: 5, max: 300 });
  const doneTtlSeconds = envPositiveInt('REDIS_WEBHOOK_DONE_TTL_SECONDS', 345600, { min: 60, max: 60 * 60 * 24 * 30 });

  const key = makeKey(params.providerCode, params.providerEventId);
  const token = makeToken();

  try {
    const claimed = await redisSetNxEx(key, token, inflightTtlSeconds);
    if (!claimed) return { kind: 'duplicate' };
    return { kind: 'claimed', key, token, doneTtlSeconds };
  } catch {
    // Redis unavailable: proceed with Postgres durability/idempotency.
    return { kind: 'unavailable' };
  }
}

export async function markWebhookIdempotencyDone(claim: Extract<ClaimResult, { kind: 'claimed' }>): Promise<void> {
  // Best-effort: if this fails, Postgres is still the source of truth.
  try {
    await redisExpire(claim.key, claim.doneTtlSeconds);
  } catch {
    // ignore
  }
}

export async function releaseWebhookIdempotencyClaim(claim: Extract<ClaimResult, { kind: 'claimed' }>): Promise<void> {
  // Best-effort: if release fails, inflight key will expire soon.
  try {
    await releaseLock(claim.key, claim.token);
  } catch {
    // ignore
  }
}

