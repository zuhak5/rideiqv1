import { z } from 'zod';

export const userRoleSchema = z.enum(['rider', 'driver', 'merchant']);
export const rideRequestStatusSchema = z.enum(['requested', 'matched', 'accepted', 'cancelled', 'no_driver', 'expired']);
export const rideStatusSchema = z.enum(['assigned', 'arrived', 'in_progress', 'completed', 'canceled']);
export const driverStatusSchema = z.enum(['offline', 'available', 'reserved', 'on_trip', 'suspended', 'assigned']);

export const appContextSchema = z.object({
  user_id: z.string().uuid(),
  active_role: userRoleSchema,
  role_onboarding_completed: z.boolean(),
  locale: z.string().default('en'),
  has_driver: z.boolean(),
  driver_vehicle_type: z.string().nullable(),
  has_merchant: z.boolean(),
  merchant_id: z.string().uuid().nullable(),
  merchant_status: z.enum(['draft', 'pending', 'approved', 'suspended']).nullable(),
});

export const fareQuoteSchema = z.object({
  quote_id: z.string().uuid().nullable(),
  stored: z.boolean(),
  service_area_id: z.string().uuid().nullable(),
  pricing_config_id: z.string().uuid().nullable(),
  cash_rounding_step_iqd: z.number().int().nullable(),
  route: z.object({
    distance: z.number(),
    duration: z.number(),
  }),
  quote: z.object({
    total_iqd: z.number().int(),
    currency: z.string(),
    distance_km: z.number(),
    duration_min: z.number(),
    product_code: z.string(),
  }).passthrough(),
}).passthrough();

export const matchRideResponseSchema = z.object({
  request: z.object({
    id: z.string().uuid().optional(),
    status: rideRequestStatusSchema.optional(),
    assigned_driver_id: z.string().uuid().nullable().optional(),
  }).passthrough().nullable(),
  rate_limit: z.object({
    remaining: z.number().int(),
    reset_at: z.string(),
  }).optional(),
});

export const rideTransitionResponseSchema = z.object({
  ok: z.boolean(),
  ride: z.object({
    id: z.string().uuid(),
    status: rideStatusSchema,
    version: z.number().int(),
  }).passthrough(),
}).passthrough();

export const rideVerifyPinResponseSchema = z.object({
  ok: z.boolean(),
  verified: z.boolean().optional(),
  code: z.string().optional(),
  remaining_attempts: z.number().int().optional(),
  locked_until: z.string().optional(),
}).passthrough();

export const ridePickupPinResponseSchema = z.object({
  required: z.boolean(),
  verified: z.boolean(),
  pin: z.string().optional(),
  verified_at: z.string().nullable().optional(),
}).passthrough();

export const ablyTokenSchema = z.object({
  ok: z.boolean(),
  token: z.object({
    token: z.string(),
  }).passthrough(),
});

export const mapsConfigV2Schema = z.object({
  ok: z.boolean(),
  capability: z.enum(['render', 'directions', 'geocode', 'distance_matrix']),
  provider: z.enum(['google', 'mapbox', 'here', 'thunderforest', 'ors']),
  config: z.object({
    language: z.string(),
    region: z.string(),
  }).passthrough(),
  fallback_order: z.array(z.enum(['google', 'mapbox', 'here', 'thunderforest', 'ors'])).optional(),
  request_id: z.string().uuid().optional(),
  telemetry_token: z.string().optional(),
  telemetry_expires_at: z.string().optional(),
}).passthrough();

export const tripShareCreateSchema = z.object({
  ok: z.boolean(),
  token: z.string().optional(),
  expires_at: z.string().optional(),
  error: z.string().optional(),
});

export const tripSharePublicSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  token_mode: z.string().optional(),
  ride: z.object({
    id: z.string().uuid(),
    status: rideStatusSchema,
    created_at: z.string(),
    started_at: z.string().nullable(),
    completed_at: z.string().nullable(),
    fare_amount_iqd: z.number().int().nullable(),
    currency: z.string(),
  }).nullable().optional(),
  request: z.object({
    id: z.string().uuid(),
    status: rideRequestStatusSchema,
    pickup: z.object({
      lat: z.number(),
      lng: z.number(),
      address: z.string().nullable(),
    }),
    dropoff: z.object({
      lat: z.number(),
      lng: z.number(),
      address: z.string().nullable(),
    }),
  }).nullable().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    updated_at: z.string(),
  }).nullable().optional(),
}).passthrough();

export type AppContext = z.infer<typeof appContextSchema>;
export type FareQuote = z.infer<typeof fareQuoteSchema>;

