import { describe, expect, test } from 'vitest';
import {
  canTransitionDriver,
  canTransitionRide,
  canTransitionRideRequest,
} from '@/lib/contracts/status';

describe('status transitions', () => {
  test('allows valid ride transitions', () => {
    expect(canTransitionRide('assigned', 'arrived')).toBe(true);
    expect(canTransitionRide('arrived', 'in_progress')).toBe(true);
    expect(canTransitionRide('in_progress', 'completed')).toBe(true);
  });

  test('blocks invalid ride transitions', () => {
    expect(canTransitionRide('assigned', 'completed')).toBe(false);
    expect(canTransitionRide('completed', 'assigned')).toBe(false);
  });

  test('allows valid ride request transitions', () => {
    expect(canTransitionRideRequest('requested', 'matched')).toBe(true);
    expect(canTransitionRideRequest('matched', 'accepted')).toBe(true);
  });

  test('allows valid driver transitions', () => {
    expect(canTransitionDriver('offline', 'available')).toBe(true);
    expect(canTransitionDriver('reserved', 'on_trip')).toBe(true);
  });

  test('blocks invalid driver transitions', () => {
    expect(canTransitionDriver('offline', 'on_trip')).toBe(false);
  });
});

