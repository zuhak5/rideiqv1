'use client';

import { useEffect, useMemo, useState } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import { appApi } from '@/lib/api';
import { adapterFor } from '@/lib/maps/adapters';

export type MapCenter = { lat: number; lng: number };

type ProviderCode = 'google' | 'mapbox' | 'here' | 'thunderforest' | 'ors';

type RenderConfig = {
  provider: ProviderCode;
  config: Record<string, unknown> & { language: string; region: string };
  request_id?: string;
  telemetry_token?: string;
};

function buildRendererUrl(center: MapCenter, renderConfig: RenderConfig): string | null {
  return adapterFor(renderConfig.provider).buildEmbedUrl(center, renderConfig.config);
}

export function MapContainer({ center, title = 'Map' }: { center: MapCenter; title?: string }) {
  const [renderConfig, setRenderConfig] = useState<RenderConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    void appApi
      .mapsConfigV2({ capability: 'render', supported: ['google', 'mapbox', 'here', 'thunderforest', 'ors'] })
      .then((response) => {
        if (!mounted) return;
        setRenderConfig({
          provider: response.provider,
          config: response.config,
          request_id: response.request_id,
          telemetry_token: response.telemetry_token,
        });
        void appApi.mapsUsage({
          provider_code: response.provider,
          capability: 'render',
          event: 'render_success',
          request_id: response.request_id,
          telemetry_token: response.telemetry_token,
        });
      })
      .catch((nextError: unknown) => {
        if (!mounted) return;
        setError(nextError instanceof Error ? nextError.message : String(nextError));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const rendererUrl = useMemo(() => {
    if (!renderConfig) return null;
    return buildRendererUrl(center, renderConfig);
  }, [center, renderConfig]);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" component="h2">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
      </Typography>

      {loading ? (
        <Stack direction="row" spacing={1} alignItems="center" aria-live="polite">
          <CircularProgress size={18} />
          <Typography variant="body2">Loading map renderer…</Typography>
        </Stack>
      ) : null}

      {!loading && error ? (
        <Typography role="status" color="error.main" variant="body2">
          Map unavailable: {error}
        </Typography>
      ) : null}

      {!loading && !error && rendererUrl ? (
        <iframe
          title="Ride map"
          src={rendererUrl}
          style={{ width: '100%', minHeight: 300, border: 0, borderRadius: 12 }}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : null}

      {!loading && !error && !rendererUrl ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Provider: {renderConfig?.provider ?? 'unknown'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This provider is configured for backend geo services or requires advanced client rendering setup.
          </Typography>
        </Paper>
      ) : null}
    </Paper>
  );
}

