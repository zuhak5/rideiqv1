import * as Ably from 'ably';
import { invokeEdge } from './edgeInvoke';

export type NearbyInvalidationSubscriptionOpts = {
  channels: string[];
  onInvalidate: () => void;
  /** Default: 1000 (max once per 1s) */
  throttleMs?: number;
};

type AblyTokenResponse = {
  ok: true;
  token: any;
};

export async function createNearbyInvalidationSubscription(opts: NearbyInvalidationSubscriptionOpts): Promise<() => void> {
  const channels = Array.isArray(opts.channels) ? opts.channels.filter((c) => typeof c === 'string' && c.trim()) : [];
  if (!channels.length) return () => {};

  const throttleMs = Math.max(100, Math.trunc(opts.throttleMs ?? 1000));

  // First token call is explicit so we can fail fast (and avoid Ably repeatedly calling authCallback when misconfigured).
  const initial = await invokeEdge<AblyTokenResponse>('ably-token', { channels });
  const initialToken = (initial.data as any)?.token;
  const tokenStr = typeof initialToken?.token === 'string' ? initialToken.token : null;
  if (!tokenStr) throw new Error('bad_ably_token');

  let closed = false;
  let lastInvalidateAt = 0;

  const realtime = new Ably.Realtime({
    token: tokenStr,
    // Refresh token when needed.
    authCallback: async (_tokenParams, callback) => {
      if (closed) return callback('closed', null);
      try {
        const res = await invokeEdge<AblyTokenResponse>('ably-token', { channels });
        callback(null, (res.data as any)?.token);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        callback(msg, null);
      }
    },
  });

  const invalidate = () => {
    if (closed) return;
    const now = Date.now();
    if (now - lastInvalidateAt < throttleMs) return;
    lastInvalidateAt = now;
    try {
      opts.onInvalidate();
    } catch {
      // ignore
    }
  };

  const subscribed: Array<{ name: string; ch: Ably.RealtimeChannel }> = [];

  for (const name of channels) {
    const ch = realtime.channels.get(name);
    subscribed.push({ name, ch });
    ch.subscribe('invalidate', invalidate);
  }

  return () => {
    if (closed) return;
    closed = true;
    for (const { name, ch } of subscribed) {
      try {
        ch.unsubscribe('invalidate', invalidate);
      } catch {
        // ignore
      }
      try {
        realtime.channels.release(name);
      } catch {
        // ignore
      }
    }
    try {
      realtime.close();
    } catch {
      // ignore
    }
  };
}
