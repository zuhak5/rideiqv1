BEGIN;
SELECT plan(12);

\set admin1 '00000000-0000-0000-0000-000000000021'

-- Required for public.profiles FK to auth.users(id)
INSERT INTO auth.users (id)
VALUES (:'admin1'::uuid)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, display_name, phone, is_admin)
VALUES (:'admin1'::uuid, 'Admin One', '+9647000000021', true)
ON CONFLICT (id) DO NOTHING;

-- Some deployments rely on admin_users membership; seed it too.
INSERT INTO public.admin_users (user_id, note)
VALUES (:'admin1'::uuid, 'pgtap seed')
ON CONFLICT (user_id) DO NOTHING;

-- Execute as authenticated admin1
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'admin1', true);

-- v3: cache_backend != off requires TTL
SELECT throws_ok(
  'SELECT public.admin_maps_provider_set_v3(''google'', 100, true, ''ar'', ''IQ'', NULL, NULL, ''redis'', NULL, NULL)',
  '22023',
  'cache_ttl_required'
);

-- v3: TTL must be in bounds (60..604800)
SELECT throws_ok(
  'SELECT public.admin_maps_provider_set_v3(''google'', 100, true, ''ar'', ''IQ'', NULL, NULL, ''redis'', 30, NULL)',
  '22023',
  'invalid_cache_ttl'
);

-- v3: success
SELECT public.admin_maps_provider_set_v3('google', 100, true, 'ar', 'IQ', NULL, NULL, 'redis', 300, NULL);

SELECT is(
  (SELECT cache_backend FROM public.admin_maps_provider_list_v3() WHERE provider_code = 'google'),
  'redis',
  'set_v3 stores cache_backend=redis'
);

SELECT is(
  (SELECT cache_enabled FROM public.admin_maps_provider_list_v2() WHERE provider_code = 'google'),
  true,
  'set_v3 stores cache_enabled=true'
);

SELECT is(
  (SELECT cache_ttl_seconds FROM public.admin_maps_provider_list_v3() WHERE provider_code = 'google'),
  300,
  'set_v3 stores cache_ttl_seconds=300'
);

-- v3: off ignores TTL and stores TTL NULL + cache_enabled=false
SELECT public.admin_maps_provider_set_v3('google', 100, true, 'ar', 'IQ', NULL, NULL, 'off', 300, NULL);

SELECT is(
  (SELECT cache_backend FROM public.admin_maps_provider_list_v3() WHERE provider_code = 'google'),
  'off',
  'set_v3 stores cache_backend=off'
);

SELECT is(
  (SELECT cache_enabled FROM public.admin_maps_provider_list_v2() WHERE provider_code = 'google'),
  false,
  'set_v3 stores cache_enabled=false when backend is off'
);

SELECT is(
  (SELECT cache_ttl_seconds FROM public.admin_maps_provider_list_v3() WHERE provider_code = 'google'),
  NULL::integer,
  'set_v3 stores cache_ttl_seconds=NULL when backend is off'
);

-- v2: cache_enabled=true requires TTL
SELECT throws_ok(
  'SELECT public.admin_maps_provider_set_v2(''mapbox'', 90, true, ''ar'', ''IQ'', NULL, NULL, true, NULL, NULL)',
  '22023',
  'cache_ttl_required'
);

-- v2: success
SELECT public.admin_maps_provider_set_v2('mapbox', 90, true, 'ar', 'IQ', NULL, NULL, true, 300, NULL);

SELECT is(
  (SELECT cache_backend FROM public.admin_maps_provider_list_v3() WHERE provider_code = 'mapbox'),
  'redis',
  'set_v2 maps cache_enabled=true to cache_backend=redis'
);

SELECT is(
  (SELECT cache_ttl_seconds FROM public.admin_maps_provider_list_v2() WHERE provider_code = 'mapbox'),
  300,
  'set_v2 stores cache_ttl_seconds=300'
);

SELECT is(
  (SELECT cache_enabled FROM public.admin_maps_provider_list_v2() WHERE provider_code = 'mapbox'),
  true,
  'set_v2 stores cache_enabled=true'
);

SELECT * FROM finish();
ROLLBACK;
