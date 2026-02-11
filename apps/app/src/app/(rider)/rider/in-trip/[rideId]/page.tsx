'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { appApi } from '@/lib/api';

export default function RiderInTripPage({ params }: { params: Promise<{ rideId: string }> }) {
  const supabase = createSupabaseBrowserClient();
  const [rideId, setRideId] = useState('');
  const [rideStatus, setRideStatus] = useState('assigned');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void params.then(async ({ rideId: nextRideId }) => {
      if (!mounted) return;
      setRideId(nextRideId);
      const { data, error: dbError } = await supabase
        .from('rides')
        .select('status')
        .eq('id', nextRideId)
        .maybeSingle();
      if (dbError) {
        setError(dbError.message);
        return;
      }
      if (data?.status) setRideStatus(data.status);
    });

    return () => {
      mounted = false;
    };
  }, [params, supabase]);

  const triggerSos = async () => {
    if (!rideId) return;
    try {
      await appApi.mapsUsage({
        provider_code: 'google',
        capability: 'render',
        event: 'render_success',
      });
      await appApi.rideTransition({ ride_id: rideId, to_status: 'arrived' });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    }
  };

  const showReceipt = useMemo(() => rideStatus === 'completed', [rideStatus]);

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">In trip</Typography>
        <Typography color="text.secondary">Ride: {rideId || '...'}</Typography>
        <Typography>Status: {rideStatus}</Typography>
        {error ? <Typography color="error.main">{error}</Typography> : null}

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button component={Link} href={`/rider/safety?rideId=${rideId}`} variant="outlined">
            Safety tools
          </Button>
          <Button component={Link} href={`/rider/support?rideId=${rideId}`} variant="outlined">
            Support
          </Button>
          <Button onClick={triggerSos} variant="contained">
            Sync state
          </Button>
        </Stack>

        {showReceipt ? (
          <Button component={Link} href={`/rider/receipt/${rideId}`} variant="contained" sx={{ mt: 2 }}>
            View receipt
          </Button>
        ) : null}
      </Paper>
    </Stack>
  );
}

