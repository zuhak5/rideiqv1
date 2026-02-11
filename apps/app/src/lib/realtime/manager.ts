'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export type SubscriptionSpec = {
  key: string;
  table: string;
  filter?: string;
  onChange: () => void;
};

export type ConnectionHealth = 'connected' | 'connecting' | 'disconnected';

export class RealtimeManager {
  private channels = new Map<string, RealtimeChannel>();
  private health: ConnectionHealth = 'disconnected';

  get connectionHealth() {
    return this.health;
  }

  subscribe(spec: SubscriptionSpec): () => void {
    if (this.channels.has(spec.key)) {
      return () => this.unsubscribe(spec.key);
    }

    const client = createSupabaseBrowserClient();
    this.health = 'connecting';

    const channel = client
      .channel(spec.key)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: spec.table,
        ...(spec.filter ? { filter: spec.filter } : {}),
      }, () => {
        spec.onChange();
      })
      .subscribe((status) => {
        this.health = status === 'SUBSCRIBED' ? 'connected' : 'disconnected';
      });

    this.channels.set(spec.key, channel);

    return () => this.unsubscribe(spec.key);
  }

  unsubscribe(key: string) {
    const existing = this.channels.get(key);
    if (!existing) return;

    const client = createSupabaseBrowserClient();
    client.removeChannel(existing);
    this.channels.delete(key);
    if (this.channels.size === 0) {
      this.health = 'disconnected';
    }
  }

  unsubscribeAll() {
    for (const key of this.channels.keys()) {
      this.unsubscribe(key);
    }
  }
}

export const realtimeManager = new RealtimeManager();

