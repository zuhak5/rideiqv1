'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getEnv } from '@/lib/env';
import type { Database } from './database.types';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  const env = getEnv();
  browserClient = createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return browserClient;
}

