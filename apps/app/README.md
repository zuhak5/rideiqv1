# RideIQ Unified App (`apps/app`)

Next.js App Router frontend for Rider + Driver + Merchant in one app.

## Project References

- Supabase project URL: `https://ehtimvlmpghstlzvfipx.supabase.co`
- GitHub repository: `https://github.com/movinesta/RideIQ`

## Local Development

1. Install dependencies from repo root:
   - `pnpm install`
2. Copy env file:
   - `cp apps/app/.env.example apps/app/.env.local`
3. Run app:
   - `pnpm -C apps/app dev`

## Quality Checks

- `pnpm -C apps/app lint`
- `pnpm -C apps/app typecheck`
- `pnpm -C apps/app build`
- `pnpm -C apps/app test`
- `pnpm -C apps/app test:e2e`

## Contract Discipline

- Contracts are documented in `docs/frontend-contracts.md`.
- DB types are generated from migrations/schema via:
  - `pnpm db:types`
- Do not invent RPC/function/table names outside backend truth.

## Deployment

See `docs/deploy-vercel.md`.
