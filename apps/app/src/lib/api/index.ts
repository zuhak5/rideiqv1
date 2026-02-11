import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { rpcCall, rpcCallMaybeArray } from './rpc';
import { invokeEdge } from './functions';
import {
  ablyTokenSchema,
  appContextSchema,
  fareQuoteSchema,
  mapsConfigV2Schema,
  matchRideResponseSchema,
  ridePickupPinResponseSchema,
  rideTransitionResponseSchema,
  rideVerifyPinResponseSchema,
  tripShareCreateSchema,
  tripSharePublicSchema,
} from '@/lib/contracts/schemas';

export const appApi = {
  getMyAppContext: async () => {
    const client = createSupabaseBrowserClient();
    return rpcCallMaybeArray({ client, rpcName: 'get_my_app_context', schema: appContextSchema });
  },
  setMyActiveRole: async (role: 'rider' | 'driver' | 'merchant') => {
    const client = createSupabaseBrowserClient();
    const { error } = await client.rpc('set_my_active_role', { p_role: role });
    if (error) throw error;
  },
  getFareQuote: async (body: {
    pickup_lat: number;
    pickup_lng: number;
    dropoff_lat: number;
    dropoff_lng: number;
    product_code?: string;
  }) => {
    const client = createSupabaseBrowserClient();
    return invokeEdge({ client, functionName: 'fare-engine', body, schema: fareQuoteSchema });
  },
  matchRide: async (body: { request_id: string; radius_m?: number; limit_n?: number; stale_after_seconds?: number }) => {
    const client = createSupabaseBrowserClient();
    return invokeEdge({ client, functionName: 'match-ride', body, schema: matchRideResponseSchema });
  },
  rideTransition: async (body: {
    ride_id: string;
    to_status: 'arrived' | 'in_progress' | 'completed' | 'canceled';
    expected_version?: number;
    cash_collected_amount_iqd?: number;
    cash_change_given_iqd?: number;
  }) => {
    const client = createSupabaseBrowserClient();
    return invokeEdge({ client, functionName: 'ride-transition', body, schema: rideTransitionResponseSchema });
  },
  rideVerifyPin: async (body: { ride_id: string; pin: string }) => {
    const client = createSupabaseBrowserClient();
    return invokeEdge({ client, functionName: 'ride-verify-pin', body, schema: rideVerifyPinResponseSchema });
  },
  ridePickupPin: async (body: { ride_id: string }) => {
    const client = createSupabaseBrowserClient();
    return invokeEdge({ client, functionName: 'ride-pickup-pin', body, schema: ridePickupPinResponseSchema });
  },
  mapsConfigV2: async (body: {
    capability: 'render' | 'directions' | 'geocode' | 'distance_matrix';
    supported?: Array<'google' | 'mapbox' | 'here' | 'thunderforest' | 'ors'>;
    exclude?: Array<'google' | 'mapbox' | 'here' | 'thunderforest' | 'ors'>;
    request_id?: string;
  }) => {
    const client = createSupabaseBrowserClient();
    return invokeEdge({ client, functionName: 'maps-config-v2', body, schema: mapsConfigV2Schema });
  },
  mapsUsage: async (body: Record<string, unknown>) => {
    const client = createSupabaseBrowserClient();
    const { error } = await client.functions.invoke('maps-usage', { body });
    if (error) throw error;
  },
  ablyToken: async (channels: string[]) => {
    const client = createSupabaseBrowserClient();
    return invokeEdge({ client, functionName: 'ably-token', body: { channels }, schema: ablyTokenSchema });
  },
  createTripShareToken: async (rideId: string, ttlMinutes = 120) => {
    const client = createSupabaseBrowserClient();
    return rpcCall({
      client,
      rpcName: 'trip_share_create_user_v1',
      args: { p_ride_id: rideId, p_ttl_minutes: ttlMinutes },
      schema: tripShareCreateSchema,
    });
  },
  getTripSharePublic: async (token: string) => {
    const client = createSupabaseBrowserClient();
    return rpcCall({
      client,
      rpcName: 'trip_share_view_public_v1',
      args: { p_token: token },
      schema: tripSharePublicSchema,
    });
  },
};

