# Unified RideIQ Next App (Rider + Driver + Merchant)

## Context / Problem Statement
- The repo currently has a rider web app (`apps/web`, Vite) and an admin dashboard (`admin_dashboard`, Next.js).
- We need a new, unified customer app at `apps/app` using Next.js App Router, keeping Supabase as the backend and preserving existing backend contracts.
- The new app must support rider, driver, and merchant flows with strict contract matching (DB schema, RPCs, Edge Functions, Realtime, Ably invalidation).

## Goals
- Build a brand-new `apps/app` frontend with role-prefixed routes:
  - `/rider/*`
  - `/driver/*`
  - `/merchant/*`
- Implement SSR-safe Supabase auth/session handling with `@supabase/ssr`.
- Implement onboarding + role gating from DB truth (`get_my_app_context`, `profiles` fields).
- Implement typed API wrappers with zod validation for critical function/RPC payloads.
- Implement mobile-first UI system with accessibility and PWA baseline.
- Add deployment and contract docs:
  - `docs/frontend-contracts.md`
  - `docs/deploy-vercel.md`

## Non-Goals
- Rewriting backend architecture.
- Removing or modifying `apps/web`.
- Replacing existing Supabase contract names or status enums.

## Proposed Design (APIs, Schema, Data Flow)
- Next app structure:
  - `src/app/(public|auth|onboarding|rider|driver|merchant)/...`
- Session/auth:
  - Supabase SSR clients in `src/lib/supabase/{server,client}.ts`.
  - PKCE callback route at `/auth/callback`.
- Role source of truth:
  - RPC `get_my_app_context`.
  - Role switching via `set_my_active_role`.
  - `profiles.role_onboarding_completed` + role-specific setup records.
- Rider flow:
  - `fare-engine` -> insert `ride_requests` -> `match-ride`.
  - Realtime reads via `ride_requests` and `rides`.
  - Trip share via `trip_share_create_user_v1` and public view via `trip_share_view_public_v1`.
- Driver flow:
  - Driver setup in `drivers` + `driver_vehicles`.
  - Location updates via `driver-location-update`.
  - Accept via `driver-accept`.
  - Ride transitions via `ride-transition`, PIN via `ride-verify-pin`.
- Merchant flow:
  - `merchants`, `merchant_products`, `merchant_promotions`.
  - Chat RPCs and order RPCs where available.
- Realtime/invalidation:
  - Supabase Realtime for table changes.
  - Ably invalidation channels `nearby:gh6:<hash6>` via `ably-token`.

## Rollout / Migration Plan
- Add app without impacting existing apps.
- Update root scripts to include `:app` aliases.
- Extend DB type generator to also write app DB types.
- No DB migration unless a confirmed frontend-blocking backend mismatch is found.
- If backend patch is needed, use additive migration + targeted function update, then update contract docs.

## Rollback Plan
- Revert only `apps/app` and related script/docs changes.
- Existing `apps/web` and backend remain operational throughout.

## Test Plan
- Contract and type generation:
  - `pnpm schema:check`
  - `pnpm db:types`
- App quality gates:
  - `pnpm -C apps/app lint`
  - `pnpm -C apps/app typecheck`
  - `pnpm -C apps/app build`
  - `pnpm -C apps/app test`
  - `pnpm -C apps/app test:e2e`
- If backend patch added:
  - `supabase db reset`
  - `supabase test db`
  - relevant `deno check` / `deno test`

## Done Checklist
- [x] `apps/app` created and configured for Next.js 16 App Router.
- [x] Root scripts updated with `dev:app/build:app/start:app/lint:app/test:app`.
- [x] `scripts/generate-db-types.mjs` writes app DB types.
- [x] Route groups + middleware role gating implemented.
- [x] Supabase SSR auth + callback implemented.
- [x] Rider/Driver/Merchant core pages wired to real backend contracts.
- [x] Realtime + Ably invalidation integrated.
- [x] PWA manifest + SW + offline banner implemented.
- [x] Accessibility baseline implemented across primitives/pages.
- [x] Unit + e2e test suites added.
- [x] `docs/frontend-contracts.md` and `docs/deploy-vercel.md` added.
