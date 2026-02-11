# ExecPlan: Restore ORS Maps Provider Support

## Context / Problem Statement
This repo’s docs and Edge Functions support OpenRouteService (ORS) as a server-side fallback provider (especially important when the active renderer is not Google/Mapbox). However, the current DB migrations/regenerated RPCs:
- Do not seed an `ors` row in `public.maps_providers` or `public.maps_provider_capabilities`.
- Reject `ors` in several SECURITY DEFINER RPC validations (`admin_maps_provider_set_v*`, capability set, cache/health helpers).

Net effect: ORS cannot be selected by `maps_pick_provider_v4`, and even if added manually, caching/health/admin RPCs can partially break.

## Goals
- Ensure ORS exists in the maps control plane:
  - Seed `maps_providers` with `provider_code='ors'`.
  - Seed `maps_provider_capabilities` with ORS (render disabled; directions/geocode/matrix enabled).
- Restore ORS support in DB helper functions used by Edge Functions:
  - `geo_cache_put_v1` accepts `ors`.
  - `maps_provider_health_on_*` accept `ors`.
- Restore ORS support in admin RPCs:
  - `admin_maps_provider_set_v1/v2/v3` accept `ors`.
  - `admin_maps_provider_capability_set_v1` accepts `ors` and prevents enabling `ors` for `render`.
- Update Edge Functions env example to document ORS env vars.

## Non-Goals
- No ORS “render” adapter in the web app.
- No changes to provider selection algorithm beyond making ORS eligible via seeded rows.
- No changes to RPC allowlists (function names/signatures remain the same).

## Proposed Design
- Add a new migration that:
  - Inserts `ors` into `maps_providers` if missing (priority between HERE and Thunderforest).
  - Inserts ORS capability rows if missing (render disabled).
  - Replaces affected functions to include `ors` in validations and keeps signatures stable.
- Update `supabase/functions/.env.example`:
  - Add `ORS_API_KEY` and `OPENROUTESERVICE_API_KEY` alias.
  - Add `ORS_DIRECTIONS_SNAP_RADIUS_METERS` tuning var.

## Rollout / Migration Plan
1. Apply migration to local (`supabase db reset`) and run pgTAP + lint.
2. Deploy migration to Supabase.
3. Configure ORS server key in Edge Function environment.
4. (Optional) Use Admin UI to tune ORS caps/priorities and capability flags.

Rollback: leave seeded rows in place but disable ORS capabilities or set `enabled=false` in `maps_providers`.

## Test Plan
- `supabase db reset --no-seed`
- `supabase db lint --schema public --level error --fail-on error`
- `supabase test db`
- Validate seeded rows exist:
  - `SELECT * FROM public.maps_providers WHERE provider_code='ors';`
  - `SELECT * FROM public.maps_provider_capabilities WHERE provider_code='ors';`

## Done Checklist
- [ ] Migration added and applied cleanly
- [ ] ORS rows seeded (providers + capabilities)
- [ ] ORS accepted by cache + health helper functions
- [ ] Admin RPCs accept ORS; ORS render cannot be enabled
- [ ] DB lint + pgTAP tests pass
- [ ] `supabase/functions/.env.example` documents ORS env vars

