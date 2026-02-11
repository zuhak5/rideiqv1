import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_APP_ORIGIN: z.string().url(),
  NEXT_PUBLIC_ENV: z.enum(['local', 'preview', 'prod']),
  NEXT_PUBLIC_ABLY_AUTH_FUNCTION_NAME: z.string().min(1).default('ably-token'),
});

export type AppEnv = z.infer<typeof envSchema>;

function base64UrlToUtf8(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice((base64.length + 3) % 4);
  const decoded = globalThis.atob ? globalThis.atob(padded) : Buffer.from(padded, 'base64').toString('binary');
  const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(base64UrlToUtf8(parts[1]));
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

function assertPublicKeySafe(key: string): void {
  if (key.startsWith('sb_secret_')) {
    throw new Error('Refusing secret Supabase key in browser runtime. Use anon key only.');
  }

  const payload = parseJwtPayload(key);
  if (payload && payload.role === 'service_role') {
    throw new Error('Refusing service_role Supabase key in browser runtime. Use anon key only.');
  }
}

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_ORIGIN: process.env.NEXT_PUBLIC_APP_ORIGIN,
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
    NEXT_PUBLIC_ABLY_AUTH_FUNCTION_NAME: process.env.NEXT_PUBLIC_ABLY_AUTH_FUNCTION_NAME,
  });

  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }

  assertPublicKeySafe(parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  cachedEnv = parsed.data;
  return parsed.data;
}

