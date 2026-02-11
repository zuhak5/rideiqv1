import { Redis as IORedis } from 'npm:ioredis@5.6.1';
import { envTrim } from './config.ts';

export type RedisClient = IORedis;

let client: RedisClient | null = null;
let connectPromise: Promise<void> | null = null;

function isPositiveInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

export function isRedisConfigured(): boolean {
  return envTrim('REDIS_URL').length > 0;
}

function requireRedisUrl(): string {
  const url = envTrim('REDIS_URL');
  if (!url) throw new Error('REDIS_NOT_CONFIGURED');
  return url;
}

function getClient(): RedisClient {
  if (client) return client;

  const url = requireRedisUrl();

  // Prefer fail-fast behavior. Callers should fall back to Postgres/provider on any Redis issue.
  client = new IORedis(url, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    commandTimeout: 2000,
    // Returning null stops reconnection attempts for that failure.
    retryStrategy: () => null,
  });

  client.on('error', () => {
    // ioredis errors are noisy; we don't log here to avoid leaking details or spamming.
    // Callers handle failures and fall back.
  });

  return client;
}

export function getRedis(): RedisClient | null {
  if (!isRedisConfigured()) return null;
  try {
    return getClient();
  } catch {
    return null;
  }
}

function resetClient(c: RedisClient) {
  try {
    c.disconnect();
  } catch {
    // ignore
  }
  client = null;
  connectPromise = null;
}

async function ensureConnected(c: RedisClient): Promise<void> {
  if (c.status === 'ready') return;

  // ioredis will throw "Stream isn't writeable" when enableOfflineQueue=false unless we wait for connect().
  if (!connectPromise) {
    connectPromise = c.connect().finally(() => {
      connectPromise = null;
    });
  }
  await connectPromise;
}

async function withClient<T>(fn: (c: RedisClient) => Promise<T>): Promise<T> {
  const c = getClient();
  try {
    await ensureConnected(c);
    return await fn(c);
  } catch (err) {
    // Reset so next request can attempt a fresh connection.
    resetClient(c);
    throw err;
  }
}

export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await withClient((c) => c.get(key));
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const ttl = isPositiveInt(ttlSeconds) ? Math.trunc(ttlSeconds) : 0;
  if (ttl <= 0) return;
  const payload = JSON.stringify(value);
  await withClient((c) => c.set(key, payload, 'EX', ttl));
}

export async function redisSetNxEx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  const ttl = isPositiveInt(ttlSeconds) ? Math.trunc(ttlSeconds) : 0;
  if (ttl <= 0) return false;
  if (!getRedis()) return false;
  const res = await withClient((c) => c.set(key, value, 'EX', ttl, 'NX'));
  return res === 'OK';
}

export async function redisSetNxPx(key: string, value: string, ttlMs: number): Promise<boolean> {
  const ttl = isPositiveInt(ttlMs) ? Math.trunc(ttlMs) : 0;
  if (ttl <= 0) return false;
  if (!getRedis()) return false;
  const res = await withClient((c) => c.set(key, value, 'PX', ttl, 'NX'));
  return res === 'OK';
}

export async function redisGet(key: string): Promise<string | null> {
  if (!getRedis()) return null;
  return await withClient((c) => c.get(key));
}

export async function redisExpire(key: string, ttlSeconds: number): Promise<void> {
  const ttl = isPositiveInt(ttlSeconds) ? Math.trunc(ttlSeconds) : 0;
  if (ttl <= 0) return;
  if (!getRedis()) return;
  await withClient((c) => c.expire(key, ttl)).catch(() => {
    // best-effort
  });
}

function makeToken(): string {
  try {
    return crypto.randomUUID().replace(/-/g, '');
  } catch {
    // Best-effort fallback: not cryptographically strong, but only used for lock ownership tokens.
    return `${Date.now()}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
  }
}

const RELEASE_LOCK_LUA = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

export async function acquireLock(key: string, ttlMs: number): Promise<{ token: string } | null> {
  const token = makeToken();
  const ok = await redisSetNxPx(key, token, ttlMs);
  if (!ok) return null;
  return { token };
}

export async function releaseLock(key: string, token: string): Promise<boolean> {
  if (!token) return false;
  if (!getRedis()) return false;
  const res = await withClient((c) => c.eval(RELEASE_LOCK_LUA, 1, key, token));
  return Number(res) === 1;
}
