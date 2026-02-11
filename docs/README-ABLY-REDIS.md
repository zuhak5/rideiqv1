# Ably + Redis (Realtime Invalidation + Geo Cache)

## Ably (Nearby Drivers: Invalidate -> Refetch)

**Goal:** rider clients do not receive continuous driver location streams. Instead, the backend publishes tiny `invalidate` events to an area channel, and the rider refetches `drivers_nearby_user_v1`.

Channel naming:
- `nearby:gh6:<geohash6>`

Publishing behavior:
- `supabase/functions/driver-location-update` publishes `{ name: "invalidate", data: { t: <ms> } }`
- Message id is bucketed for idempotency: `inv:<geohash6>:<bucket>` where `bucket = floor(now / 2000)`

Token issuance:
- Riders call `supabase/functions/ably-token` (requires user JWT)
- The token capability is subscribe-only, scoped to exactly the requested channels.

Edge env vars:
- `ABLY_API_KEY=<appId>.<keyId>:<secret>`

Web env vars:
- None (web obtains tokens via `ably-token`)

Failure mode:
- If Ably is not configured or unavailable, the rider UI falls back to low-frequency polling.

## Redis (Geo Cache)

**Goal:** move geo cache reads/writes out of Postgres into Redis (JSON + TTL), with Postgres RPC as a fallback.

Redis key format:
- `geo:v1:<cacheKey>`

Edge env vars:
- Prefer TLS when available:
  - `REDIS_URL=rediss://default:<password>@<host>:<tlsPort>`
- If your Redis endpoint only supports plaintext on the given port, use:
  - `REDIS_URL=redis://default:<password>@<host>:<port>`

Failure mode:
- If Redis is not configured or unavailable, `supabase/functions/geo` falls back to `geo_cache_get_v1` / `geo_cache_put_v1`.

## Redis (Idempotency + Locks)

**Goal:** use Redis as a best-effort accelerator (not source of truth) to reduce Postgres load from retries/duplicates.

Used for:
- Payment webhooks: prefilter duplicate `provider_event_id` deliveries before hitting Postgres.
- Driver accept: short lock per `request_id` to reduce concurrent accept RPC calls, plus idempotent success caching for retries.

Key prefixes:
- `rideiq:idem:webhook:<provider_code>:<provider_event_id>`
- `rideiq:lock:accept:<request_id>`
- `rideiq:idem:driver_accept:<driver_id>:<request_id>`

Optional env tuning:
- `REDIS_WEBHOOK_DONE_TTL_SECONDS` (default `345600`)
- `REDIS_WEBHOOK_INFLIGHT_TTL_SECONDS` (default `30`)
- `REDIS_ACCEPT_LOCK_TTL_MS` (default `5000`)
- `REDIS_IDEMPOTENCY_TTL_SECONDS` (default `600`)
