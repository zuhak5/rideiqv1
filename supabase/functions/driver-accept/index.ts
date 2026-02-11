import { createUserClient, requireUser } from '../_shared/supabase.ts';
import { errorJson, json } from '../_shared/json.ts';
import { buildRateLimitHeaders, consumeRateLimit, getClientIp } from '../_shared/rateLimit.ts';
import { logAppEvent } from '../_shared/log.ts';
import { withRequestContext } from '../_shared/requestContext.ts';
import { acquireLock, getRedis, releaseLock } from '../_shared/redis.ts';
import { buildIdempotencyKey, getIdempotentResponse, setIdempotentResponse } from '../_shared/idempotency.ts';

type DriverAcceptBody = {
  request_id?: string;
};

function envPositiveInt(name: string, fallback: number, bounds: { min: number; max: number }): number {
  const raw = (Deno.env.get(name) ?? '').trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(bounds.min, Math.min(bounds.max, Math.trunc(n)));
}

Deno.serve((req) =>
  withRequestContext('driver-accept', req, async (_ctx) => {

  if (req.method !== 'POST') {
    return errorJson('Method not allowed', 405);
  }

  const { user, error: authError } = await requireUser(req);
  if (!user) {
    return errorJson(String(authError ?? 'Unauthorized'), 401, 'UNAUTHORIZED');
  }

  // Rate limit: accepting should be bounded too
  const ip = getClientIp(req);
  const rl = await consumeRateLimit({
    key: `accept:${user.id}:${ip ?? 'noip'}`,
    windowSeconds: 60,
    limit: 20,
  });
  if (!rl.allowed) {
    const rlHeaders = buildRateLimitHeaders({ limit: 20, remaining: rl.remaining, resetAt: rl.resetAt });
    rlHeaders['Retry-After'] = String(Math.max(1, Math.ceil((new Date(rl.resetAt).getTime() - Date.now()) / 1000)));
    return json(
      { error: 'Rate limit exceeded', code: 'RATE_LIMITED', reset_at: rl.resetAt, remaining: rl.remaining },
      429,
      rlHeaders,
    );
  }

  const body: DriverAcceptBody = await req.json().catch(() => ({}));
  const requestId = body.request_id;
  if (!requestId) {
    return errorJson('request_id is required', 400, 'VALIDATION_ERROR');
  }

  const ctx = _ctx;
  ctx.setUserId(user.id);

  const redis = getRedis();
  const lockTtlMs = envPositiveInt('REDIS_ACCEPT_LOCK_TTL_MS', 5000, { min: 500, max: 30000 });
  const idemTtlSeconds = envPositiveInt('REDIS_IDEMPOTENCY_TTL_SECONDS', 600, { min: 30, max: 60 * 60 });

  const lockKey = `rideiq:lock:accept:${requestId}`;
  const idemKey = `rideiq:idem:${buildIdempotencyKey(['driver_accept', user.id, requestId])}`;

  let lock: { token: string } | null = null;

  // Call as the authenticated user so auth.uid() is available to the DB layer.
  const supabase = createUserClient(req);

  try {
    // Short Redis lock: avoids thundering herd/double-taps; DB remains the source of truth.
    if (redis) {
      try {
        lock = await acquireLock(lockKey, lockTtlMs);
        if (!lock) {
          const h = { ..._ctx.headers, 'Retry-After': '1' };
          return errorJson('Accept already in progress', 409, 'ACCEPT_IN_PROGRESS', { retry_after_s: 1 }, h);
        }
      } catch {
        // Fail-open when Redis is unavailable.
      }
    }

    // Idempotency fast-path (best-effort).
    if (redis) {
      const cached = await getIdempotentResponse<{ ride?: any }>(idemKey);
      if (cached?.ride) {
        const rlHeaders = buildRateLimitHeaders({ limit: 20, remaining: rl.remaining, resetAt: rl.resetAt });
        return json({ ride: cached.ride, rate_limit: { remaining: rl.remaining, reset_at: rl.resetAt } }, 200, { ..._ctx.headers, ...rlHeaders });
      }
    }

    const { data, error } = await supabase.rpc('dispatch_accept_ride_user', {
      p_request_id: requestId,
    });

    if (error) {
      const msg = String(error.message ?? 'Unknown error');
      if (msg.includes('insufficient_wallet_balance')) {
        return errorJson('Rider has insufficient wallet balance for this ride.', 409, 'INSUFFICIENT_FUNDS', undefined, _ctx.headers);
      }

      // Idempotent recovery: request may have already been accepted (DB will raise request_not_matched).
      if (msg.includes('request_not_matched')) {
        if (redis) {
          const cached = await getIdempotentResponse<{ ride?: any }>(idemKey);
          if (cached?.ride) {
            const rlHeaders = buildRateLimitHeaders({ limit: 20, remaining: rl.remaining, resetAt: rl.resetAt });
            return json({ ride: cached.ride, rate_limit: { remaining: rl.remaining, reset_at: rl.resetAt } }, 200, { ..._ctx.headers, ...rlHeaders });
          }
        }

        // Best-effort: if Redis cache is missing, try to load the existing ride.
        try {
          const { data: ride } = await supabase
            .from('rides')
            .select('id,status,rider_id,driver_id,started_at,completed_at,fare_amount_iqd,currency')
            .eq('request_id', requestId)
            .maybeSingle();

          if (ride) {
            const accepted = {
              ride_id: (ride as any).id,
              ride_status: (ride as any).status,
              request_status: 'accepted',
              wallet_hold_id: null,
              rider_id: (ride as any).rider_id,
              driver_id: (ride as any).driver_id,
              started_at: (ride as any).started_at,
              completed_at: (ride as any).completed_at,
              fare_amount_iqd: (ride as any).fare_amount_iqd,
              currency: (ride as any).currency,
            };

            if (redis) {
              await setIdempotentResponse(idemKey, { ride: accepted }, idemTtlSeconds);
            }

            const rlHeaders = buildRateLimitHeaders({ limit: 20, remaining: rl.remaining, resetAt: rl.resetAt });
            return json({ ride: accepted, rate_limit: { remaining: rl.remaining, reset_at: rl.resetAt } }, 200, { ..._ctx.headers, ...rlHeaders });
          }
        } catch {
          // ignore and fall through to the default error
        }
      }

      await logAppEvent({
        event_type: 'dispatch_accept_ride_error',
        actor_id: user.id,
        actor_type: 'driver',
        request_id: requestId,
        payload: { message: msg },
      });
      return errorJson(msg, 400, 'DISPATCH_ERROR', undefined, _ctx.headers);
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (redis) {
      await setIdempotentResponse(idemKey, { ride: row }, idemTtlSeconds);
    }

    await logAppEvent({
      event_type: 'dispatch_accept_ride',
      actor_id: user.id,
      actor_type: 'driver',
      request_id: requestId,
      ride_id: row?.ride_id,
      payload: { status: row?.ride_status },
    });

    const rlHeaders = buildRateLimitHeaders({ limit: 20, remaining: rl.remaining, resetAt: rl.resetAt });
    return json(
      { ride: row, rate_limit: { remaining: rl.remaining, reset_at: rl.resetAt } },
      200,
      { ..._ctx.headers, ...rlHeaders },
    );
  } finally {
    if (redis && lock) {
      try {
        await releaseLock(lockKey, lock.token);
      } catch {
        // ignore
      }
    }
  }
  }),
);
