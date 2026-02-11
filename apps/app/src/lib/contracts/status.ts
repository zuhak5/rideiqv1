import { rideStatusSchema, rideRequestStatusSchema, driverStatusSchema } from './schemas';

export type RideStatus = typeof rideStatusSchema._type;
export type RideRequestStatus = typeof rideRequestStatusSchema._type;
export type DriverStatus = typeof driverStatusSchema._type;

const rideTransitions: Record<RideStatus, RideStatus[]> = {
  assigned: ['arrived', 'canceled'],
  arrived: ['in_progress', 'canceled'],
  in_progress: ['completed', 'canceled'],
  completed: [],
  canceled: [],
};

const rideRequestTransitions: Record<RideRequestStatus, RideRequestStatus[]> = {
  requested: ['matched', 'cancelled', 'no_driver', 'expired'],
  matched: ['accepted', 'cancelled', 'no_driver', 'expired'],
  accepted: [],
  cancelled: [],
  no_driver: ['matched', 'cancelled', 'expired'],
  expired: ['matched', 'cancelled'],
};

const driverTransitions: Record<DriverStatus, DriverStatus[]> = {
  offline: ['available', 'suspended'],
  available: ['offline', 'reserved', 'assigned', 'suspended'],
  reserved: ['available', 'on_trip', 'suspended'],
  assigned: ['available', 'on_trip', 'suspended'],
  on_trip: ['available', 'suspended'],
  suspended: ['offline'],
};

export function canTransitionRide(from: RideStatus, to: RideStatus): boolean {
  return rideTransitions[from].includes(to);
}

export function canTransitionRideRequest(from: RideRequestStatus, to: RideRequestStatus): boolean {
  return rideRequestTransitions[from].includes(to);
}

export function canTransitionDriver(from: DriverStatus, to: DriverStatus): boolean {
  return driverTransitions[from].includes(to);
}

