# Deploying `apps/app` on Vercel

## Canonical Targets

- Supabase project URL: `https://ehtimvlmpghstlzvfipx.supabase.co`
- GitHub repository: `https://github.com/movinesta/RideIQ`

## Vercel Project Settings

- Root Directory: `apps/app`
- Build Command: `pnpm -C apps/app build`
- Install Command: `pnpm install`
- Output Directory: Next.js default (`.next`)

## Required Environment Variables

Set these in both Preview and Production environments:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_ORIGIN`
- `NEXT_PUBLIC_ENV` (`preview` or `prod`)
- `NEXT_PUBLIC_ABLY_AUTH_FUNCTION_NAME` (default: `ably-token`)

Do **not** expose:
- Supabase service role key
- Ably API private key
- Payment provider secrets

## Supabase Auth Redirect Configuration

In Supabase Dashboard (`Authentication -> URL Configuration`), allow:
- Local: `http://localhost:3000/auth/callback`
- Preview wildcard: `https://*.vercel.app/auth/callback`
- Production: `https://<your-production-domain>/auth/callback`

If OAuth providers are used, mirror the same callback URLs in provider configuration.

## Suggested Preview vs Production Values

- Preview
  - `NEXT_PUBLIC_APP_ORIGIN=https://<project>-<branch>-<team>.vercel.app`
  - `NEXT_PUBLIC_ENV=preview`
- Production
  - `NEXT_PUBLIC_APP_ORIGIN=https://<your-production-domain>`
  - `NEXT_PUBLIC_ENV=prod`

## PWA Deployment Notes

- Manifest route: `src/app/manifest.ts`
- Service worker: `public/sw.js`
- Client registration: `src/components/pwa/ServiceWorkerRegistration.tsx`
- Icons:
  - `public/icons/icon-192.png`
  - `public/icons/icon-512.png`
  - `public/icons/icon-maskable-512.png`

Caching policy:
- Static shell assets are cached.
- Supabase Auth/RPC/Edge responses are not cached in SW.
- Third-party map assets are network-first with runtime fallback.

## Security Headers

Configured via `apps/app/next.config.ts`:
- CSP with allowlisted Supabase + maps + Ably domains
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` baseline

## Post-Deploy Smoke Checklist

1. Open `/sign-in` and verify auth flow completes.
2. Verify middleware role redirects:
   - unauthenticated -> `/sign-in`
   - role mismatch -> role home
3. Verify rider quote flow reaches `/rider/matching`.
4. Verify driver location updates reach `driver-location-update`.
5. Verify public share route `/share/<token>` loads for valid tokens.