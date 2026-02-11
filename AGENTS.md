# RideIQ — Agent Working Guide

This repository is a pnpm monorepo with:
- `apps/web`: rider-facing web app (React + Vite)
- `admin_dashboard`: admin console (Next.js)
- `supabase/`: database schema/migrations + Supabase Edge Functions (Deno)

Toolchain targets (match CI):
- Node.js: 20.x
- pnpm: 9.x
- Deno: 1.x
- Supabase CLI + Docker for local DB

Codex can layer nested `AGENTS.override.md` files closer to the code you’re editing. Keep repo-wide rules here; put area-specific rules next to their code.

## Fast commands (use these, not guesswork)

### Install
```bash
pnpm install
```

### Web app (Vite)
```bash
cp apps/web/.env.example apps/web/.env.local
pnpm dev            # runs apps/web dev server
pnpm -C apps/web test
pnpm -C apps/web lint
pnpm -C apps/web typecheck
```

### Admin dashboard (Next.js on :3001)
```bash
cp admin_dashboard/.env.example admin_dashboard/.env.local
pnpm dev:admin
pnpm -C admin_dashboard test
pnpm -C admin_dashboard test:e2e
pnpm -C admin_dashboard lint
pnpm -C admin_dashboard typecheck
```

### Supabase local stack (DB + Auth + Storage)
Requires Docker + Supabase CLI.
```bash
supabase start
supabase db reset --no-seed
supabase db lint --schema public --level error --fail-on error
supabase test db
```

### Supabase Edge Functions (Deno)
```bash
cp supabase/functions/.env.example supabase/functions/.env
deno check supabase/functions/*/index.ts supabase/functions/_shared/*.ts
deno test supabase/functions/tests
```

### Full repo gate (matches CI intent)
```bash
pnpm check          # lint + tests + build + audits
pnpm check:strict   # same, but includes typecheck
```

## ExecPlans (required for “big” changes)
If a change touches 2+ surfaces (DB + Edge + Web, auth model changes, geo/provider changes, realtime architecture, payments), write an ExecPlan before coding.

Convention:
- Create: `.agent/execplans/YYYY-MM-DD--short-slug.md`
- Keep it updated as you implement.
- The plan must be runnable/understandable from the repo alone.

Minimum sections:
- Context / problem statement
- Goals + non-goals
- Proposed design (APIs, schema, data flow)
- Rollout / migration plan (including rollback)
- Test plan (what commands to run)
- “Done” checklist

## Repo structure

- `apps/web/`
  - React + Vite UI; uses `@supabase/supabase-js`, TanStack Query, Mapbox GL.
- `admin_dashboard/`
  - Next.js App Router admin console; Supabase SSR auth; separate port (`3001`).
- `supabase/`
  - `schema.sql`: baseline snapshot
  - `migrations/*.sql`: additive schema changes
  - `functions/*`: Edge Functions (Deno) + shared helpers in `functions/_shared/`
  - `tests/*.test.sql`: pgTAP tests run by `supabase test db`
- `docs/`
  - Operational and security docs (environment separation, key policy, webhook processing, dispatch performance, etc).

## Non-negotiable guardrails

### Secrets and keys
- Never commit secrets (CI runs secret scanning).
- Browser code must only use publishable/anon Supabase keys. The web client hard-fails on `sb_secret_*` or legacy `service_role` JWTs (`apps/web/src/lib/supabaseClient.ts`).
- Keep third‑party maps keys server-side (Edge Functions). The web app should fetch runtime config via Edge Functions, not bundling keys.

### Edge Function auth contract (critical)
Many functions have `verify_jwt = false` in `supabase/config.toml`, so each function must enforce its own auth (user JWT, cron secret, webhook signature, etc). The repo enforces this via:
- `config/security/edge-auth-contract.json`
- `node scripts/audit-edge-functions.mjs` (also run in CI)
See `docs/security/edge-function-auth-contract.md`.

If you add or modify an Edge Function:
1) Decide its auth model.
2) Update `config/security/edge-auth-contract.json`.
3) Ensure the function contains the matching guard (`requireUser*`, `requireCronSecret`, webhook verification, etc).
4) Run: `pnpm security:audit`.

### RPC allowlist + security hardening
- Any new SQL function intended to be callable from client code must be added to `config/security/rpc-allowlist.json`.
- After changes, run:
  - `pnpm security:generate:check` (or `pnpm security:generate` to update generated SQL)
  - `pnpm security:rpc-audit`
This repo’s posture is “deny-by-default then re-grant explicitly”.

### Database migration discipline
- Do not make ad-hoc schema changes in remote dashboards.
- Add new SQL in `supabase/migrations/` and validate with:
  - `supabase db reset`
  - `supabase test db`
See `docs/db-migrations.md`.

## Coding conventions by area

### Supabase Edge Functions (Deno)
- Entry points are `supabase/functions/<fn>/index.ts`. Reuse shared helpers from `supabase/functions/_shared/`.
- Wrap handlers with `withRequestContext(<name>, req, ...)` for consistent logging/metrics/error shaping.
- Use `json()` / `errorJson()` for responses (these include CORS headers).
- For endpoints that can incur spend (maps/geo, payments, etc), use rate limiting helpers (`_shared/rateLimit.ts`) and fail-closed.
- Prefer RLS-scoped access where possible:
  - For user requests, avoid service-role access unless absolutely required; use user-scoped clients and DB-side wrappers.

### Web app (`apps/web`)
- React + Vite. Keep Supabase config in `apps/web/.env.local` (Vite vars).
- Prefer typed DB access via `apps/web/src/lib/database.types.ts` (generated by `pnpm db:types`).
- After adding new `.from('table')`, `.rpc('fn')`, or `.functions.invoke('fn')` calls, run `pnpm schema:check` (it’s regex-based but catches common contract breaks).

### Admin dashboard (`admin_dashboard`)
- Next.js App Router + Supabase SSR.
- Use the logged-in user’s JWT for calls; authorization is enforced via `public.is_admin()` / RBAC RPCs.
- Formatting: Prettier is configured; use `pnpm -C admin_dashboard format` as needed.

## Realtime locations + caching guidance (project-specific)

### Nearby drivers (Realtime)
When implementing driver live location / nearby-driver updates:
- Prefer a realtime transport (e.g., Ably channels) for fanout; don’t poll Postgres every second.
- Keep payloads small (Ably message accounting is in 5KiB chunks; oversized payloads cost multiple messages).
- Use region/city/area channels (not one global channel) to reduce unnecessary fanout.
- Store “last known location” in Postgres for recovery/audit, but treat realtime as the primary UX path.

### Redis (one high-leverage use)
If Redis is used for only one thing, use it to cache expensive, repeatable geo/map results (routes, geocodes, distance matrices) to reduce latency and third-party/API spend.

Implementation rule of thumb:
- Cache key = stable, normalized inputs (provider + action + coordinates + options).
- TTL = hours–days (routes/geocodes change slowly; matrices can be shorter).
- Never cache secrets; only cache results.

## How to work (agent workflow)

1) Make the smallest correct change (avoid repo-wide refactors unless asked).
2) Run the narrowest relevant checks:
   - Web changes → `pnpm -C apps/web lint && pnpm -C apps/web test`
   - Edge Functions → `deno check ... && deno test supabase/functions/tests`
   - DB changes → `supabase db reset && supabase test db`
3) If you changed auth/RPC/migrations, run `pnpm check` before finalizing.
