'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function RiderEnRoutePage({ params }: { params: Promise<{ requestId: string }> }) {
  const supabase = createSupabaseBrowserClient();
  const [requestId, setRequestId] = useState('');
  const [status, setStatus] = useState('requested');
  const [rideId, setRideId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void params.then(async ({ requestId: nextId }) => {
      if (!mounted) return;
      setRequestId(nextId);

      const { data: requestRow } = await supabase
        .from('ride_requests')
        .select('status')
        .eq('id', nextId)
        .maybeSingle();
      if (requestRow?.status) setStatus(requestRow.status);

      const { data: rideRow } = await supabase
        .from('rides')
        .select('id,status')
        .eq('request_id', nextId)
        .maybeSingle();
      if (rideRow?.id) {
        setRideId(rideRow.id);
      }
    });

    return () => {
      mounted = false;
    };
  }, [params, supabase]);

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Driver en route</Typography>
        <Typography color="text.secondary">Request: {requestId || '...'}</Typography>
        <Typography>Status: {status}</Typography>
        {rideId ? (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button component={Link} href={`/rider/pickup-verify/${rideId}`} variant="outlined">
              Pickup PIN
            </Button>
            <Button component={Link} href={`/rider/in-trip/${rideId}`} variant="contained">
              Open trip
            </Button>
          </Stack>
        ) : (
          <Typography sx={{ mt: 1 }} color="text.secondary">
            Waiting for ride creation.
          </Typography>
        )}
      </Paper>
    </Stack>
  );
}

