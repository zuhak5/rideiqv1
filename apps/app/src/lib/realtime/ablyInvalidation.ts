'use client';

import * as Ably from 'ably';
import { appApi } from '@/lib/api';

type InvalidationOptions = {
  channels: string[];
  onInvalidate: () => void;
  throttleMs?: number;
};

export class AblyInvalidationManager {
  private client: Ably.Realtime | null = null;
  private listeners = new Map<string, () => void>();
  private lastInvalidateAt = 0;

  async connect(options: InvalidationOptions): Promise<() => void> {
    const channels = options.channels.filter(Boolean);
    if (!channels.length) return () => undefined;

    const tokenResponse = await appApi.ablyToken(channels);
    const token = tokenResponse.token.token;

    const throttleMs = Math.max(250, Math.floor(options.throttleMs ?? 1000));

    this.client = new Ably.Realtime({
      token,
      authCallback: async (_params, callback) => {
        try {
          const refreshed = await appApi.ablyToken(channels);
          callback(null, refreshed.token as unknown as Ably.TokenDetails);
        } catch (error) {
          callback(error instanceof Error ? error.message : String(error), null);
        }
      },
    });

    for (const channelName of channels) {
      const channel = this.client.channels.get(channelName);
      const handler = () => {
        const now = Date.now();
        if (now - this.lastInvalidateAt < throttleMs) return;
        this.lastInvalidateAt = now;
        options.onInvalidate();
      };
      channel.subscribe('invalidate', handler);
      this.listeners.set(channelName, handler);
    }

    return () => this.disconnect();
  }

  disconnect() {
    if (!this.client) return;
    for (const [channelName, handler] of this.listeners.entries()) {
      const channel = this.client.channels.get(channelName);
      channel.unsubscribe('invalidate', handler);
      this.client.channels.release(channelName);
    }
    this.listeners.clear();
    this.client.close();
    this.client = null;
  }
}

export const ablyInvalidationManager = new AblyInvalidationManager();

