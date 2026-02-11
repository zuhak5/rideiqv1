# Frontend Contracts (Unified Next App)

This document is the backend integration source of truth used by `apps/app`.
All names below are copied from current repository contracts (migrations/functions/docs) and intentionally not renamed.

## Contract Scope

Inspected sources:
- `supabase/migrations/*` (with focus on `20260201001000_public_schema.sql` and deltas)
- `supabase/functions/*` and `supabase/functions/_shared/*`
- `docs/README-ABLY-REDIS.md`
- `scripts/schema-contract-check.mjs`
- `scripts/generate-db-types.mjs`

## Global Identity, Roles, and Onboarding

### Tables
- `public.profiles`
  - role fields: `active_role`, `role_onboarding_completed`, `locale`
- `public.drivers`
- `public.driver_vehicles`
- `public.merchants`
- `public.profile_kyc`

### Enums
- `public.user_role`: `rider | driver | merchant`
- `public.driver_status`: `offline | available | on_trip | suspended | reserved | assigned`
- `public.ride_request_status`: `requested | matched | accepted | cancelled | no_driver | expired`
- `public.ride_status`: `assigned | arrived | in_progress | completed | canceled`

### RPCs
- `get_my_app_context()`
- `set_my_active_role(p_role public.user_role)`

## Rider Contracts

### Core tables
- `public.ride_requests`
- `public.rides`
- `public.driver_locations`
- `public.trip_share_tokens`

### Key RPCs
- `drivers_nearby_user_v1(...)`
- `cancel_ride_request(p_request_id uuid)`
- `submit_ride_rating(p_ride_id uuid, p_rating smallint, p_comment text)`
- `trip_share_create_user_v1(p_ride_id uuid, p_ttl_minutes integer)`
- `trip_share_view_public_v1(p_token text)`
- `support_categories_list_user_v1()`
- `support_ticket_create_user_v1(...)`
- `support_ticket_list_user_v1(...)`
- `support_ticket_get_user_v1(p_ticket_id uuid)`
- `support_ticket_post_message_user_v1(...)`

### Edge Functions
- `fare-engine`
  - input: pickup/dropoff coordinates + `product_code`
  - output: `quote_id`, `quote.total_iqd`, `route.distance`, `route.duration`, etc.
- `match-ride`
  - input: `request_id`, optional match parameters
  - output: `{ request, rate_limit }`
- `ride-pickup-pin`
  - input: `ride_id`
  - output: required/verified state and optionally `pin`
- `ride-transition`
  - input: `ride_id`, `to_status`, optional version/cash fields
  - output: updated ride state
- `safety-sos`
- `ridecheck-respond`
- `safety-report`

## Driver Contracts

### Core tables
- `public.drivers`
- `public.driver_vehicles`
- `public.ride_requests`
- `public.rides`
- `public.profile_kyc`
- `public.driver_shifts`

### Key RPCs
- `driver_location_upsert_user_v1(...)`
- `driver_settlement_get_my_account_v1()`
- `driver_settlement_list_entries_v1(...)`
- `driver_settlement_list_payment_requests_v1(...)`
- `driver_settlement_list_payout_requests_v1(...)`
- `driver_settlement_request_payment_v1(...)`
- `driver_settlement_request_payout_v1(...)`

### Edge Functions
- `driver-location-update`
  - input: `lat`, `lng`, `vehicle_type`, optional accuracy/heading/speed
- `driver-accept`
  - input: `request_id`
  - output: `ride` payload
- `ride-verify-pin`
  - input: `ride_id`, `pin`
- `ride-transition`
- `shift-planner`
  - methods: GET/POST/PATCH/DELETE

## Merchant Contracts

### Core tables
- `public.merchants`
- `public.merchant_products`
- `public.merchant_promotions`
- `public.merchant_chat_threads`
- `public.merchant_chat_messages`

### Key RPCs
- `merchant_chat_get_or_create_thread(p_merchant_id uuid)`
- `merchant_chat_list_messages(...)`
- `merchant_chat_mark_read(p_thread_id uuid)`
- `merchant_order_create(...)`
- `merchant_order_request_delivery(p_order_id uuid)`
- `merchant_order_set_status(...)`
- `merchant_settlement_get_my_account_v1()`
- `merchant_settlement_list_entries_v1(...)`
- `merchant_settlement_request_payment_v1(...)`
- `merchant_settlement_request_payout_v1(...)`

## Realtime Contracts

### Supabase Realtime (Postgres changes)
Used in frontend through explicit channel subscriptions:
- `ride_requests` (rider/driver views)
- `rides` (rider/driver active trip)
- `merchant_orders` and chat tables where applicable

### Ably Invalidation (nearby drivers)
From `docs/README-ABLY-REDIS.md`:
- channel format: `nearby:gh6:<geohash6>`
- event shape: `{ name: "invalidate", data: { t: <ms> } }`
- rider client behavior: receive `invalidate` then refetch `drivers_nearby_user_v1`
- token source: edge function `ably-token`
- fallback: low-frequency polling when Ably unavailable

## Maps Contracts

### Edge function
- `maps-config-v2`
  - capability-driven provider selection
  - provider values can include: `google | mapbox | here | thunderforest | ors`
  - returns provider-specific `config` + `fallback_order` + render telemetry token fields
- `maps-usage`
  - render telemetry ingestion (`render_success` / `render_failure`)

## Contract Hazards and Mismatch Notes

1. Spelling split is intentional and must not be normalized:
- `ride_request_status`: `cancelled`
- `ride_status`: `canceled`

2. `ors` appears in maps provider contracts, but is primarily a backend geo provider and not a full client map renderer.

3. Passkey functions (`passkey-authenticate`, `passkey-register`) require authenticated context and are treated as account security flows, not initial login bootstrap.

4. Driver online UX must respect KYC checks from `profile_kyc.status` (`verified` required for online in frontend policy).

## Current Gaps / "Coming soon"

- Merchant promotions UI is scaffolded, but advanced campaign tooling is not fully surfaced in `apps/app` yet.
- Merchant order end-user workflows are partially scaffolded and should be expanded in follow-up implementation passes.

## Backend Issues Checked During Frontend Build

- No confirmed frontend-blocking schema/contract bug required a migration patch during this implementation.
- Existing contracts were preserved and consumed as-is.

