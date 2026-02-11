'use client';

import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { appApi } from '@/lib/api';

export default function PickupVerifyPage({ params }: { params: Promise<{ rideId: string }> }) {
  const [rideId, setRideId] = useState('');
  const [pin, setPin] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void params.then(async ({ rideId: nextRideId }) => {
      if (!mounted) return;
      setRideId(nextRideId);
      try {
        const response = await appApi.ridePickupPin({ ride_id: nextRideId });
        if (response.pin) setPin(response.pin);
        if (response.verified) setVerified(true);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : String(nextError));
      }
    });

    return () => {
      mounted = false;
    };
  }, [params]);

  const refresh = async () => {
    if (!rideId) return;
    setError(null);
    const response = await appApi.ridePickupPin({ ride_id: rideId });
    setPin(response.pin ?? null);
    setVerified(Boolean(response.verified));
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Pickup verification</Typography>
        <Typography color="text.secondary">Ride: {rideId || '...'}</Typography>
        {verified ? <Typography sx={{ mt: 1 }}>Pickup already verified.</Typography> : null}
        {pin ? <Typography sx={{ mt: 1, fontSize: 28, fontWeight: 700 }}>{pin}</Typography> : null}
        {error ? <Typography color="error.main">{error}</Typography> : null}
        <Button variant="outlined" sx={{ mt: 2 }} onClick={refresh}>
          Refresh PIN
        </Button>
      </Paper>
    </Stack>
  );
}

