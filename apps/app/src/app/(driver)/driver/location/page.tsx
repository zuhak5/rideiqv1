'use client';

import { useRef, useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/design-system/components/primitives/Toast';

export default function DriverLocationPage() {
  const supabase = createSupabaseBrowserClient();
  const { pushToast } = useToast();
  const watchIdRef = useRef<number | null>(null);

  const [tracking, setTracking] = useState(false);
  const [lastFix, setLastFix] = useState<{ lat: number; lng: number; accuracy: number | null } | null>(null);

  const stop = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  };

  const start = async () => {
    if (!navigator.geolocation) {
      pushToast('Geolocation is unavailable in this browser.', 'error');
      return;
    }

    setTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null;
        setLastFix({ lat, lng, accuracy });

        const { error } = await supabase.functions.invoke('driver-location-update', {
          body: {
            lat,
            lng,
            accuracy_m: accuracy,
            heading: position.coords.heading,
            speed_mps: position.coords.speed,
            vehicle_type: 'car_private',
          },
        });

        if (error) {
          pushToast(error.message, 'error');
        }
      },
      (error) => {
        pushToast(error.message, 'error');
        stop();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Location updates</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Keep this page active while driving to publish location updates.
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={start} disabled={tracking}>
            Start tracking
          </Button>
          <Button variant="outlined" onClick={stop} disabled={!tracking}>
            Stop tracking
          </Button>
        </Stack>

        {lastFix ? (
          <Typography sx={{ mt: 2 }}>
            Last fix: {lastFix.lat.toFixed(5)}, {lastFix.lng.toFixed(5)} {lastFix.accuracy ? `(±${Math.round(lastFix.accuracy)}m)` : ''}
          </Typography>
        ) : null}
      </Paper>
    </Stack>
  );
}

