'use client';

import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { appApi } from '@/lib/api';
import { MapContainer } from '@/components/map/MapContainer';

type ShareState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: Awaited<ReturnType<typeof appApi.getTripSharePublic>> };

export default function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const [state, setState] = useState<ShareState>({ status: 'loading' });

  useEffect(() => {
    let mounted = true;

    void params
      .then((resolved) => appApi.getTripSharePublic(resolved.token))
      .then((data) => {
        if (!mounted) return;
        setState({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      mounted = false;
    };
  }, [params]);

  if (state.status === 'loading') {
    return <Typography sx={{ p: 2 }}>Loading shared trip...</Typography>;
  }

  if (state.status === 'error') {
    return <Typography sx={{ p: 2, color: 'error.main' }}>Unable to load shared trip: {state.message}</Typography>;
  }

  if (!state.data.ok || !state.data.ride) {
    return <Typography sx={{ p: 2 }}>Shared trip is not available ({state.data.error ?? 'unknown'}).</Typography>;
  }

  return (
    <Stack sx={{ p: 2 }} spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Trip share</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Chip label={`Ride ${state.data.ride.id.slice(0, 8)}...`} />
          <Chip label={`Status: ${state.data.ride.status}`} />
        </Stack>
      </Paper>

      {state.data.location ? (
        <MapContainer center={{ lat: state.data.location.lat, lng: state.data.location.lng }} title="Driver location" />
      ) : null}

      {state.data.request ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1">Route</Typography>
          <Typography variant="body2" color="text.secondary">
            Pickup: {state.data.request.pickup.address ?? `${state.data.request.pickup.lat}, ${state.data.request.pickup.lng}`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Dropoff: {state.data.request.dropoff.address ?? `${state.data.request.dropoff.lat}, ${state.data.request.dropoff.lng}`}
          </Typography>
        </Paper>
      ) : null}
    </Stack>
  );
}

