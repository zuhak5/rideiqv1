'use client';

import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { appApi } from '@/lib/api';
import { FormField } from '@/design-system/components/primitives/FormField';
import { useToast } from '@/design-system/components/primitives/Toast';

export default function DriverActiveRidePage({ params }: { params: Promise<{ rideId: string }> }) {
  const supabase = createSupabaseBrowserClient();
  const { pushToast } = useToast();

  const [rideId, setRideId] = useState('');
  const [ride, setRide] = useState<{ id: string; status: 'assigned' | 'arrived' | 'in_progress' | 'completed' | 'canceled'; version: number } | null>(null);
  const [pin, setPin] = useState('');

  const load = async (id: string) => {
    const { data } = await supabase
      .from('rides')
      .select('id,status,version')
      .or(`id.eq.${id},request_id.eq.${id}`)
      .maybeSingle();

    if (!data) {
      setRide(null);
      return;
    }

    setRide({
      id: data.id,
      status: data.status,
      version: data.version,
    });
  };

  useEffect(() => {
    let mounted = true;
    void params.then(async ({ rideId: nextRideId }) => {
      if (!mounted) return;
      setRideId(nextRideId);
      await load(nextRideId);
    });
    return () => {
      mounted = false;
    };
  }, [params]);

  const transition = async (toStatus: 'arrived' | 'in_progress' | 'completed' | 'canceled') => {
    if (!ride) return;
    try {
      await appApi.rideTransition({
        ride_id: ride.id,
        to_status: toStatus,
        expected_version: ride.version,
      });
      pushToast(`Ride moved to ${toStatus}.`, 'success');
      await load(ride.id);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : String(error), 'error');
    }
  };

  const verifyPin = async () => {
    if (!ride || !pin) return;
    try {
      const response = await appApi.rideVerifyPin({
        ride_id: ride.id,
        pin,
      });
      if (!response.ok || response.verified === false) {
        pushToast(response.code ?? 'PIN verification failed', 'error');
        return;
      }
      pushToast('Pickup PIN verified.', 'success');
      setPin('');
      await load(ride.id);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : String(error), 'error');
    }
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Active ride</Typography>
        <Typography color="text.secondary">Input id: {rideId || '...'}</Typography>

        {ride ? (
          <>
            <Typography sx={{ mt: 1 }}>Ride id: {ride.id}</Typography>
            <Typography>Status: {ride.status}</Typography>
            <Typography color="text.secondary">Version: {ride.version}</Typography>

            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
              <Button variant="outlined" onClick={() => void transition('arrived')}>
                Arrived
              </Button>
              <Button variant="outlined" onClick={() => void transition('in_progress')}>
                Start trip
              </Button>
              <Button variant="outlined" onClick={() => void transition('completed')}>
                Complete
              </Button>
              <Button variant="outlined" color="error" onClick={() => void transition('canceled')}>
                Cancel
              </Button>
            </Stack>

            <Stack spacing={1} sx={{ mt: 2, maxWidth: 260 }}>
              <FormField label="Pickup PIN" value={pin} onChange={(event) => setPin(event.target.value)} />
              <Button variant="contained" onClick={verifyPin}>
                Verify PIN
              </Button>
            </Stack>
          </>
        ) : (
          <Typography sx={{ mt: 1 }} color="text.secondary">
            No ride found for this identifier.
          </Typography>
        )}
      </Paper>
    </Stack>
  );
}

