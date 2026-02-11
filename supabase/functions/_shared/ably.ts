import { envTrim } from './config.ts';

const ABLY_BASE_URL = 'https://main.realtime.ably.net';

function requireAblyApiKey(): string {
  const key = envTrim('ABLY_API_KEY');
  if (!key) throw new Error('ABLY_NOT_CONFIGURED');
  // Format: <appId>.<keyId>:<secret>
  if (!key.includes(':') || key.startsWith(':')) throw new Error('ABLY_BAD_API_KEY');
  return key;
}

function toBase64(raw: string): string {
  // btoa expects a binary string; ABLY keys are ASCII, but be defensive.
  try {
    return btoa(raw);
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = (globalThis as any).unescape?.(encodeURIComponent(raw));
    return btoa(u);
  }
}

function ablyAuthHeader(apiKey: string): string {
  return `Basic ${toBase64(apiKey)}`;
}

function extractKeyName(apiKey: string): string {
  return apiKey.split(':')[0] ?? '';
}

function makeNonce(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) {
    try {
      return cryptoApi.randomUUID().replace(/-/g, '');
    } catch {
      // fall through
    }
  }

  if (cryptoApi?.getRandomValues) {
    try {
      const bytes = new Uint8Array(16);
      cryptoApi.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // fall through
    }
  }

  // Last resort: non-crypto nonce (still better than omitting).
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

export async function ablyPublish(
  channel: string,
  name: string,
  data: unknown,
  id?: string,
): Promise<void> {
  const apiKey = requireAblyApiKey();

  const url = `${ABLY_BASE_URL}/channels/${encodeURIComponent(channel)}/messages`;
  const body: Record<string, unknown> = { name, data };
  if (id) body.id = id;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: ablyAuthHeader(apiKey),
      'x-ably-version': '1.2',
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ABLY_PUBLISH_HTTP_${res.status}: ${text || res.statusText}`);
  }
}

export async function ablyRequestToken(params: {
  clientId: string;
  channels: string[];
  ttlMs: number;
}): Promise<any> {
  const apiKey = requireAblyApiKey();
  const keyName = extractKeyName(apiKey);
  if (!keyName) throw new Error('ABLY_BAD_API_KEY');

  const cap: Record<string, string[]> = {};
  for (const ch of params.channels) cap[ch] = ['subscribe'];

  const url = `${ABLY_BASE_URL}/keys/${encodeURIComponent(keyName)}/requestToken`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: ablyAuthHeader(apiKey),
      'x-ably-version': '1.2',
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      keyName,
      clientId: params.clientId,
      ttl: Math.max(1, Math.trunc(params.ttlMs)),
      capability: JSON.stringify(cap),
      // Ably expects token request params to include a timestamp; provide one to avoid request validation errors.
      timestamp: Date.now(),
      nonce: makeNonce(),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ABLY_TOKEN_HTTP_${res.status}: ${text || res.statusText}`);
  }

  return await res.json();
}
