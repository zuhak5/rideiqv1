'use client';

import { useEffect, useMemo, useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { ablyInvalidationManager } from '@/lib/realtime/ablyInvalidation';
import { geohash6 } from '@/lib/realtime/geohash';
import { trackEvent } from '@/lib/analytics/events';

type DriverPoint = {
  id: string;
  lat: number;
  lng: number;
  vehicle_type: string;
};

export function NearbyDriversCard({ pickupLat, pickupLng }: { pickupLat: number; pickupLng: number }) {
  const supabase = createSupabaseBrowserClient();
  const [drivers, setDrivers] = useState<DriverPoint[]>([]);
  const [status, setStatus] = useState<'idle' | 'connected' | 'polling'>('idle');

  const channel = useMemo(() => `nearby:gh6:${geohash6(pickupLat, pickupLng)}`, [pickupLat, pickupLng]);

  const refetch = async () => {
    const { data } = await supabase.rpc(
      'drivers_nearby_user_v1',
      {
        p_request_id: null,
        p_pickup_lat: pickupLat,
        p_pickup_lng: pickupLng,
        p_radius_m: 5000,
        p_limit_n: 25,
        p_required_capacity: 4,
        p_stale_after_s: 120,
      } as never,
    );

    const payload = data as { ok?: boolean; drivers?: DriverPoint[] } | null;
    setDrivers(payload?.ok ? payload.drivers ?? [] : []);
  };

  useEffect(() => {
    void refetch();

    let timer: ReturnType<typeof setInterval> | null = null;
    let cleanup: (() => void) | null = null;

    void ablyInvalidationManager
      .connect({
        channels: [channel],
        onInvalidate: () => void refetch(),
      })
      .then(async (unsubscribe) => {
        cleanup = unsubscribe;
        setStatus('connected');
        await trackEvent('realtime_connected', { channel });
      })
      .catch(async () => {
        setStatus('polling');
        timer = setInterval(() => void refetch(), 30_000);
        await trackEvent('realtime_disconnected', { channel, fallback: 'polling' });
      });

    return () => {
      if (timer) clearInterval(timer);
      cleanup?.();
      void trackEvent('realtime_disconnected', { channel });
    };
  }, [channel, pickupLat, pickupLng]);

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Nearby drivers</Typography>
        <Chip size="small" label={status === 'connected' ? 'Realtime' : status === 'polling' ? 'Polling' : 'Idle'} />
      </Stack>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {drivers.length} drivers around pickup area ({channel})
      </Typography>
    </Paper>
  );
}

