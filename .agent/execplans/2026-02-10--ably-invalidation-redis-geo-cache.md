# ExecPlan: Ably Nearby-Drivers Invalidation + Redis Geo Cache

Date: 2026-02-10

## Context / Problem Statement

Nearby drivers were refreshed primarily via short stale times/polling, and geo provider caching in `supabase/functions/geo` relied on Postgres RPC cache tables. We want:
- Lower realtime fanout cost by publishing tiny invalidation messages to area channels (not streaming driver locations).
- Faster repeated geo requests via Redis, with safe fallback behavior when Redis is not configured or unavailable.

## Goals

- Rider clients subscribe to a single Ably channel for the pickup area.
- Backend publishes small `invalidate` events when a driver updates location.
- Rider UI refetches `drivers_nearby_user_v1` on invalidation (React Query invalidate -> refetch).
- Replace Postgres geo-cache reads/writes with Redis `GET/SET` (JSON + TTL), while preserving Postgres cache as a fallback.
- Best-effort behavior: Ably/Redis failures must not break core flows.

## Non-Goals

- No schema redesign or new DB migrations.
- No per-second driver live tracking streams.
- No removal of existing RPC cache functions (they remain as fallback).

## Proposed Design

### Ably: Invalidate -> Refetch

- Channel naming: `nearby:gh6:<geohash6>`
- Driver updates publish:
  - Name: `invalidate`
  - Data: `{ t: <ms> }`
  - Idempotent message id: `inv:<geohash6>:<bucket>` where `bucket=floor(now/2000)`
- Rider web app:
  - Computes `geohash6` from pickup coordinates.
  - Calls edge function `ably-token` to obtain a subscribe-only token scoped to the needed channel(s).
  - Subscribes and throttles invalidations (max once/sec) then invalidates the React Query key.
  - Keeps `refetchInterval: 30_000` as a fallback.

### Redis: Geo Cache

- Redis key: `geo:v1:<cacheKey>`
- `supabase/functions/geo`:
  - `cacheGet`: try Redis; on miss/failure fall back to `geo_cache_get_v1`
  - `cachePut`: try Redis; on failure fall back to `geo_cache_put_v1`
- Redis helper is fail-fast; callers catch and fall back.

## Rollout / Migration Plan

1. Deploy `ably-token` Edge Function and configure `ABLY_API_KEY`.
2. Deploy updated `driver-location-update` Edge Function.
3. Deploy updated web app with Ably subscription logic (fallback polling retained).
4. Configure `REDIS_URL` for Edge Functions.
5. Monitor:
   - Ably token issuance errors
   - Ably publish failures
   - Redis get/set failures and Postgres fallback rates

Rollback:
- Remove/disable Ably env var or revert web subscription (polling remains).
- Remove/disable `REDIS_URL` to force Postgres cache fallback.

## Test Plan

- `pnpm install`
- `pnpm security:audit`
- `node scripts/audit-function-key-requirements.mjs`
- `deno check supabase/functions/*/index.ts supabase/functions/_shared/*.ts`
- `pnpm -C apps/web typecheck`
- `pnpm -C apps/web lint`
- `pnpm -C apps/web test`
- `pnpm schema:check`

## Done Checklist

- [x] Ably REST helper added and used for publish + token issuance.
- [x] New `ably-token` Edge Function implemented and added to auth + key requirement contracts.
- [x] Driver location update publishes idempotent invalidation events (best-effort).
- [x] Web RiderPage subscribes to invalidations and refetches nearby drivers; polling fallback retained.
- [x] Redis helper added and `geo` edge function updated to prefer Redis with Postgres fallback.
- [x] Env var documentation added.

