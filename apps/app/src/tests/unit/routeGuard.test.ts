import { describe, expect, test } from 'vitest';
import { decideRedirect } from '@/lib/middleware/routeGuard';

describe('route guard decisions', () => {
  test('redirects unauthenticated protected route to sign-in', () => {
    const decision = decideRedirect({
      pathname: '/rider/home',
      isAuthenticated: false,
      context: null,
    });

    expect(decision.redirectTo).toBe('/sign-in');
  });

  test('allows unauthenticated public share route', () => {
    const decision = decideRedirect({
      pathname: '/share/abc123',
      isAuthenticated: false,
      context: null,
    });

    expect(decision.redirectTo).toBeNull();
  });

  test('redirects onboarding-incomplete users to role', () => {
    const decision = decideRedirect({
      pathname: '/rider/home',
      isAuthenticated: true,
      context: {
        user_id: 'd2d572f0-7783-4f8f-a213-6ffbe7fcf2df',
        active_role: 'rider',
        role_onboarding_completed: false,
        locale: 'en',
        has_driver: false,
        driver_vehicle_type: null,
        has_merchant: false,
        merchant_id: null,
        merchant_status: null,
      },
    });

    expect(decision.redirectTo).toBe('/role');
  });

  test('redirects role mismatch to active role home', () => {
    const decision = decideRedirect({
      pathname: '/driver/home',
      isAuthenticated: true,
      context: {
        user_id: 'd2d572f0-7783-4f8f-a213-6ffbe7fcf2df',
        active_role: 'rider',
        role_onboarding_completed: true,
        locale: 'en',
        has_driver: false,
        driver_vehicle_type: null,
        has_merchant: false,
        merchant_id: null,
        merchant_status: null,
      },
    });

    expect(decision.redirectTo).toBe('/rider/home');
  });
});

