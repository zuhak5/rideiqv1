import { describe, expect, test } from 'vitest';
import {
  appContextSchema,
  fareQuoteSchema,
  matchRideResponseSchema,
  tripSharePublicSchema,
} from '@/lib/contracts/schemas';

describe('contract schemas', () => {
  test('parses app context', () => {
    const parsed = appContextSchema.parse({
      user_id: 'd2d572f0-7783-4f8f-a213-6ffbe7fcf2df',
      active_role: 'rider',
      role_onboarding_completed: true,
      locale: 'en',
      has_driver: false,
      driver_vehicle_type: null,
      has_merchant: false,
      merchant_id: null,
      merchant_status: null,
    });

    expect(parsed.active_role).toBe('rider');
  });

  test('parses fare quote payload', () => {
    const parsed = fareQuoteSchema.parse({
      quote_id: 'c3a320ce-5c40-41ad-a565-c2e6718f89fa',
      stored: true,
      service_area_id: 'b41920bb-e85b-47a2-b453-d4f20ab7d670',
      pricing_config_id: null,
      cash_rounding_step_iqd: 250,
      route: { distance: 2400, duration: 540 },
      quote: {
        total_iqd: 6750,
        currency: 'IQD',
        distance_km: 2.4,
        duration_min: 9,
        product_code: 'standard',
      },
    });

    expect(parsed.quote.total_iqd).toBe(6750);
  });

  test('parses match-ride response', () => {
    const parsed = matchRideResponseSchema.parse({
      request: {
        id: 'c3a320ce-5c40-41ad-a565-c2e6718f89fa',
        status: 'matched',
        assigned_driver_id: 'dc36253b-29a2-42f1-84d6-3d8bd431f782',
      },
      rate_limit: {
        remaining: 8,
        reset_at: new Date().toISOString(),
      },
    });

    expect(parsed.request?.status).toBe('matched');
  });

  test('parses public trip share', () => {
    const parsed = tripSharePublicSchema.parse({
      ok: true,
      token_mode: 'token',
      ride: {
        id: '9ad0bce9-8d24-48d7-af4a-2d175f1dbdcf',
        status: 'assigned',
        created_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        fare_amount_iqd: null,
        currency: 'IQD',
      },
      request: {
        id: 'c3a320ce-5c40-41ad-a565-c2e6718f89fa',
        status: 'matched',
        pickup: { lat: 33.3152, lng: 44.3661, address: 'Baghdad' },
        dropoff: { lat: 33.35, lng: 44.43, address: 'Karrada' },
      },
    });

    expect(parsed.ok).toBe(true);
    expect(parsed.request?.status).toBe('matched');
  });
});

