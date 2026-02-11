import { createServiceClient } from '../_shared/supabase.ts';
import { errorJson, json } from '../_shared/json.ts';
import { getZaincashV2Config } from '../_shared/zaincashV2.ts';
import { shaHex, verifyJwtHS256 } from '../_shared/crypto.ts';
import { enqueueWebhookJob, runWebhookJobs } from '../_shared/webhookJobs.ts';
import { tryWaitUntil } from '../_shared/background.ts';
import { storeProviderEvent } from '../_shared/providerEvents.ts';
import { isProduction } from '../_shared/env.ts';
import { withRequestContext } from '../_shared/requestContext.ts';
import { emitMetricBestEffort } from '../_shared/metrics.ts';
import { requireFreshWebhookTimestamp } from '../_shared/webhookReplay.ts';
import { claimWebhookIdempotency, markWebhookIdempotencyDone, releaseWebhookIdempotencyClaim } from '../_shared/webhookIdempotency.ts';

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function pickFirst(...vals: unknown[]) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    return v;
  }
  return null;
}

Deno.serve((req) =>
  withRequestContext('zaincash-webhook', req, async (ctx) => {
    // verify_jwt=false in config.toml (webhook endpoint)

    try {
      if (req.method !== 'POST') {
        emitMetricBestEffort(ctx, { event_type: 'metric.webhook.ignored', payload: { provider_code: 'zaincash', reason: 'method' } });
        return errorJson('Method not allowed', 405, 'METHOD_NOT_ALLOWED', undefined, ctx.headers);
      }

      // Optional timestamp-based replay guard (best-effort; only enforced if header is present).
      const tsGuard = requireFreshWebhookTimestamp(req, ctx.headers);
      if (tsGuard) {
        emitMetricBestEffort(ctx, { event_type: 'metric.webhook.ignored', payload: { provider_code: 'zaincash', reason: 'stale_timestamp' } });
        return tsGuard;
      }

      const body = await req.json().catch(() => null);
      const token = String(pickFirst((body as any)?.webhook_token, (body as any)?.webhookToken, (body as any)?.token) ?? '').trim();

      if (!token) {
        // Always 200 so gateway doesn't keep retrying invalid requests.
        emitMetricBestEffort(ctx, { event_type: 'metric.webhook.ignored', payload: { provider_code: 'zaincash', reason: 'missing_webhook_token' } });
        return json({ ok: true, ignored: true, reason: 'missing_webhook_token' }, 200, ctx.headers);
      }

      const cfg = getZaincashV2Config();

      // Webhook token is a JWT signed with ApiKey (HS256).
      const claims = await verifyJwtHS256(token, cfg.apiKey);
      if (!claims) {
        emitMetricBestEffort(ctx, { event_type: 'metric.webhook.auth_fail', level: 'warn', payload: { provider_code: 'zaincash', reason: 'invalid_token' } });
        return errorJson('Invalid webhook token', 401, 'INVALID_TOKEN', undefined, ctx.headers);
      }

      const eventId = String(
        pickFirst((claims as any)?.eventId, (claims as any)?.event_id, (claims as any)?.jti, (claims as any)?.id) ?? '',
      ).trim();

      // This is our topup_intents.id (UUID) we sent as externalReferenceId when initializing the payment.
      const intentId = String(
        pickFirst(
          (claims as any)?.externalReferenceId,
          (claims as any)?.external_reference_id,
          (claims as any)?.merchantReference,
        ) ?? '',
      ).trim();

      if (intentId && isUuid(intentId)) {
        ctx.setCorrelationId(intentId);
      }

      const service = createServiceClient();

      const stableEventId = eventId || (await shaHex('SHA-256', token));

      // Redis idempotency gate (fast prefilter before hitting Postgres).
      const claim = await claimWebhookIdempotency({ providerCode: 'zaincash', providerEventId: stableEventId });
      if (claim.kind === 'duplicate') {
        emitMetricBestEffort(ctx, { event_type: 'metric.webhook.duplicate_short_circuit', level: 'warn', payload: { provider_code: 'zaincash' } });
        return json({ ok: true, accepted: true, queued: false, duplicate: true, short_circuited: true, event_id: stableEventId || null }, 200, ctx.headers);
      }

      let stored: Awaited<ReturnType<typeof storeProviderEvent>>;
      try {
        // Durable inbox (idempotent). Store only after token verification.
        stored = await storeProviderEvent(service, 'zaincash', stableEventId, { claims, raw: body });
      } catch (e) {
        if (claim.kind === 'claimed') await releaseWebhookIdempotencyClaim(claim);
        throw e;
      }

      if (!intentId || !isUuid(intentId)) {
        if (claim.kind === 'claimed') await releaseWebhookIdempotencyClaim(claim);
        emitMetricBestEffort(ctx, { event_type: 'metric.webhook.ignored', payload: { provider_code: 'zaincash', reason: 'missing_or_invalid_externalReferenceId' } });
        return json({ ok: true, ignored: true, reason: 'missing_or_invalid_externalReferenceId', event_id: stableEventId || null }, 200, ctx.headers);
      }

      if (!stored.inserted) {
        emitMetricBestEffort(ctx, { event_type: 'metric.webhook.duplicate', level: 'warn', payload: { provider_code: 'zaincash' } });
      }

      // Queue async processing (retries/backoff handled by the worker).
      let queued = false;
      try {
        const out = await enqueueWebhookJob(service, {
          providerCode: 'zaincash',
          providerEventId: stableEventId,
          providerEventPk: stored.id,
          jobKind: 'topup_webhook',
          correlationId: intentId,
        });
        queued = Boolean((out as any)?.queued);
      } catch (e) {
        if (claim.kind === 'claimed') await releaseWebhookIdempotencyClaim(claim);
        throw e;
      }

      if (claim.kind === 'claimed') await markWebhookIdempotencyDone(claim);

      // Optional best-effort immediate processing.
      const scheduled = tryWaitUntil(runWebhookJobs(service, { limit: 1, hardMax: 1 }));
      if (!scheduled && !isProduction()) await runWebhookJobs(service, { limit: 1, hardMax: 1 });

      emitMetricBestEffort(ctx, { event_type: 'metric.webhook.accepted', payload: { provider_code: 'zaincash', queued } });

      return json(
        { ok: true, accepted: true, queued, duplicate: !stored.inserted, intent_id: intentId, event_id: stableEventId || null },
        200,
        ctx.headers,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      emitMetricBestEffort(ctx, { event_type: 'metric.webhook.internal_error', level: 'error', payload: { provider_code: 'zaincash', error: msg } });
      return errorJson(msg, 500, 'INTERNAL_ERROR', undefined, ctx.headers);
    }
  })
);
