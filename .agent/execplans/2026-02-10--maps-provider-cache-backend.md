# ExecPlan: Maps Provider Cache Backend (Off | Redis | Supabase)

## Context / Problem Statement
Today `public.maps_providers.cache_enabled` is a boolean. When enabled, the `geo` Edge Function uses Redis (if configured) with Postgres `geo_cache_*` as a fallback. The admin UI can only choose `On/Off`, which makes it hard to:
- Disable caching fully (to avoid stale routes).
- Force “Supabase cache” (Postgres) vs “Redis cache” explicitly.
- Reason about where cached responses are stored.

## Goals
- Replace the boolean “cache enabled” control with an explicit per-provider cache backend:
  - `off`
  - `redis`
  - `supabase` (Postgres `geo_cache_*` RPCs)
- Enforce a single consistent cache invariant:
  - If backend = `off` → `cache_enabled=false` and `cache_ttl_seconds=NULL`.
  - If backend ≠ `off` → `cache_enabled=true` and `cache_ttl_seconds` is required and bounded (`60..604800`).
- Keep the system fail-open: if Redis is unavailable, requests still succeed using Postgres cache and/or upstream calls.
- Keep backwards compatibility for existing RPCs/UI by retaining `cache_enabled` and mapping it to a default backend (`redis`).

## Non-Goals
- No schema redesign beyond adding one column + RPCs.
- No new realtime behavior.
- No changes to cache key generation.

## Proposed Design
- DB:
  - Add `maps_providers.cache_backend` as `public.maps_cache_backend` enum (`off|redis|supabase`).
  - Backfill existing `cache_enabled=true` rows to `cache_backend='redis'`.
  - Add new admin RPCs:
    - `admin_maps_provider_list_v3()` returns `cache_backend`.
    - `admin_maps_provider_set_v3(..., p_cache_backend, p_cache_ttl_seconds, ...)`.
  - Keep v2 RPCs:
    - v2 list stays stable; v2 set maps `cache_enabled=true` to `cache_backend='redis'`.
  - Prevent drift with:
    - RPC-level validation (friendly errors)
    - Table CHECK constraint (`maps_providers_cache_backend_ttl_chk`) for direct writes.
- Edge:
  - `getProviderDefaults()` reads `cache_backend` and falls back to legacy `cache_enabled`.
  - `geo/index.ts` routes cache reads/writes based on backend:
    - `redis` uses Redis JSON keys (namespace `geo:v1:*`), falling back to Postgres only when Redis is unavailable/errors.
    - `supabase` uses Postgres RPC cache only.
    - `off` bypasses cache.
- Web:
  - Admin maps page swaps the cache checkbox for a select: `Off | Redis | Supabase`.
  - Uses v3 RPCs.

## Rollout / Migration Plan
1. Deploy DB migration adding `cache_backend` + v3 RPCs.
2. Deploy updated `geo` Edge Function and shared orchestrator.
3. Deploy web UI changes (Admin maps page).
4. Monitor:
   - `geo.cache.redis_*` warning logs.
   - Cache hit metrics in admin maps request stats.

Rollback: revert UI to v2 RPCs and keep `cache_enabled` behavior; `cache_backend` column is additive and safe to leave.

## Test Plan
- `pnpm security:generate`
- `pnpm schema:check`
- `deno check supabase/functions/*/index.ts supabase/functions/_shared/*.ts`
- `pnpm -C apps/web typecheck`
- Smoke:
  - Set provider cache backend = `off` and confirm route requests do not hit cache.
  - Set backend = `supabase` and confirm `geo_cache_*` gets populated.
  - Set backend = `redis` and confirm Redis keys appear; if Redis fails, confirm fallback to `geo_cache_*` and requests still succeed.

## Done Checklist
- [ ] DB migration applied
- [ ] Edge `geo` uses backend selection
- [ ] Admin UI supports backend selection
- [ ] RPC allowlist updated + hardening regenerated
- [ ] Deployed to Supabase + pushed to GitHub
