# ExecPlan: Redis Idempotency + Locks (Webhooks + Driver Accept)

## Context / Problem Statement
RideIQ relies on Postgres for webhook durability/idempotency (`provider_events` unique index) and DB row-locking in `dispatch_accept_ride()` to prevent double-accept. Under retries or thundering herd (webhook re-deliveries, driver double-taps, multi-device retries), we still pay the cost of hitting Postgres for work that can be safely short-circuited.

We want to use Redis Cloud as a **best-effort accelerator**:
- Pre-filter duplicate payment webhooks before hitting Postgres most of the time.
- Add a short accept lock to reduce concurrent accept RPC calls.
- Add idempotency caching for driver accept so client retries return the same success result.

Redis must **never** be the source of truth; if Redis is down/unconfigured the system should behave as it does today.

## Goals
- Webhooks: fast 200 short-circuit for duplicate provider events using Redis two-phase keys (inflight -> done).
- Driver accept: short Redis lock per `request_id` to avoid concurrent accepts; idempotent retries return cached success.
- Shared helpers in `supabase/functions/_shared/*` consistent with existing patterns; no secret logging.

## Non-Goals
- No DB schema changes.
- No redesign of provider event inbox (`provider_events`) or webhook job workers.
- No changes to client/web surfaces (only Edge Functions).

## Proposed Design
### Redis Shared Client (`supabase/functions/_shared/redis.ts`)
- Singleton `ioredis` client per isolate, with:
  - `lazyConnect: true`, `connectTimeout` low, bounded retries.
  - Fail-open helpers that return `null/false` on errors.
- Helpers:
  - `redisSetNxEx`, `redisSetNxPx`, `redisGet`, `redisExpire`
  - `acquireLock` (SET NX PX with random token)
  - `releaseLock` (Lua compare-and-del)
- Key prefix `rideiq:` for new features.

### Webhook Idempotency (`supabase/functions/_shared/webhookIdempotency.ts`)
- Key: `rideiq:idem:webhook:<provider_code>:<provider_event_id>`
- Two-phase:
  1. `claim()` inflight via `SET ... NX EX inflightTTL`
  2. `markDone()` extends TTL to done window (default 4 days)
- On Postgres failure after claim, `release()` the inflight token (Lua compare-and-del).

### Driver Accept Idempotency (`supabase/functions/_shared/idempotency.ts` + `driver-accept`)
- Lock key: `rideiq:lock:accept:<request_id>` (default TTL 5s)
- Idem key: `rideiq:idem:driver_accept:<driver_id>:<request_id>` (default TTL 10m)
- Flow:
  - Acquire lock; if not acquired return 409 `ACCEPT_IN_PROGRESS`.
  - If cached success exists, return it.
  - Call `dispatch_accept_ride_user`.
  - On success cache response and return.
  - If RPC returns `request_not_matched`, recover by reading cached response or fetching `rides` by `request_id`.
  - Always release lock in `finally`.

## Rollout / Migration Plan
1. Deploy Edge Functions changes.
2. Configure `REDIS_URL` in Supabase secrets; optionally tune TTL env vars.
3. Monitor:
   - webhook short-circuit metrics
   - accept lock contention and success rates
4. Rollback: unset `REDIS_URL` or redeploy previous function versions.

## Test Plan
- Typecheck:
  - `deno check supabase/functions/*/index.ts supabase/functions/_shared/*.ts`
- Smoke tests (manual via curl):
  - webhook duplicate behavior (send identical payload twice)
  - driver accept double-tap behavior (two requests quickly)

## Done Checklist
- [ ] New shared Redis helpers added and used (fail-open).
- [ ] All listed webhook handlers patched with Redis prefilter.
- [ ] `driver-accept` patched with Redis lock + idempotency.
- [ ] Docs and `.env.example` updated (no secrets committed).
- [ ] Deployed to Supabase project and pushed to GitHub branch.

