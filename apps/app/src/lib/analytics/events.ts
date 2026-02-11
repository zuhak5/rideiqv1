'use client';

import { getEnv } from '@/lib/env';

type Role = 'rider' | 'driver' | 'merchant';

type FunnelEvent =
  | 'auth_started'
  | 'auth_completed'
  | 'role_selected'
  | 'profile_completed'
  | 'quote_viewed'
  | 'request_created'
  | 'matching_started'
  | 'driver_assigned'
  | 'trip_started'
  | 'trip_completed'
  | 'rating_submitted'
  | 'went_online'
  | 'request_received'
  | 'accepted'
  | 'pickup_verified'
  | 'earnings_viewed'
  | 'chat_opened'
  | 'autoreply_configured'
  | 'payout_requested';

type ReliabilityEvent =
  | 'realtime_connected'
  | 'realtime_disconnected'
  | 'realtime_reconnected'
  | 'edge_function_error'
  | 'rpc_error';

export type AnalyticsEvent = {
  name: FunnelEvent | ReliabilityEvent;
  role?: Role;
  userId?: string;
  sessionId: string;
  payload?: Record<string, unknown>;
  ts: string;
  env: string;
};

export interface AnalyticsTransport {
  send(event: AnalyticsEvent): void | Promise<void>;
}

class ConsoleTransport implements AnalyticsTransport {
  send(event: AnalyticsEvent) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[analytics]', event);
    }
  }
}

const sessionId = crypto.randomUUID();
let transport: AnalyticsTransport = new ConsoleTransport();

export function setAnalyticsTransport(nextTransport: AnalyticsTransport) {
  transport = nextTransport;
}

export async function trackEvent(name: AnalyticsEvent['name'], payload?: Record<string, unknown>) {
  const env = getEnv();
  const event: AnalyticsEvent = {
    name,
    role: (payload?.role as Role | undefined) ?? undefined,
    userId: (payload?.userId as string | undefined) ?? undefined,
    sessionId,
    payload,
    ts: new Date().toISOString(),
    env: env.NEXT_PUBLIC_ENV,
  };

  await transport.send(event);
}

