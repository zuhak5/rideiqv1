import { withRequestContext } from '../_shared/requestContext.ts';
import { errorJson, json } from '../_shared/json.ts';
import { requireUser } from '../_shared/supabase.ts';
import { ablyRequestToken } from '../_shared/ably.ts';

const CHANNEL_RE = /^nearby:[a-z0-9_:-]+$/;

type Body = {
  channels: string[];
};

export default Deno.serve((req: Request) => withRequestContext('ably-token', req, async (ctx) => {
  if (req.method !== 'POST') return errorJson('Method not allowed', 405, 'method_not_allowed');

  const auth = await requireUser(req, ctx);
  if (!auth.user) return errorJson(auth.error ?? 'Unauthorized', 401, 'unauthorized');

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return errorJson('Invalid JSON body', 400, 'bad_json');
  }

  const channelsRaw = Array.isArray((body as any)?.channels) ? (body as any).channels : null;
  if (!channelsRaw) return errorJson('Invalid channels', 400, 'bad_channels');
  if (channelsRaw.length < 1 || channelsRaw.length > 10) return errorJson('Invalid channels', 400, 'bad_channels');

  const channels: string[] = [];
  for (const c0 of channelsRaw) {
    if (typeof c0 !== 'string') return errorJson('Invalid channel', 400, 'bad_channel');
    const c = c0.trim();
    if (!c) return errorJson('Invalid channel', 400, 'bad_channel');
    if (c.length > 128) return errorJson('Invalid channel', 400, 'bad_channel');
    if (!CHANNEL_RE.test(c)) return errorJson('Invalid channel', 400, 'bad_channel');
    channels.push(c);
  }

  const unique = Array.from(new Set(channels));
  const clientId = `rider:${auth.user.id}`;

  try {
    const token = await ablyRequestToken({
      clientId,
      channels: unique,
      ttlMs: 60 * 60 * 1000,
    });
    return json({ ok: true, token });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('ABLY_NOT_CONFIGURED')) {
      return errorJson('Ably not configured', 500, 'ABLY_NOT_CONFIGURED');
    }

    ctx.error('ably.token_issue_failed', { error: msg });
    return errorJson('Unable to issue Ably token', 502, 'ABLY_TOKEN_ERROR');
  }
}));

