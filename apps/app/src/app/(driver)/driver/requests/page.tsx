'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/design-system/components/primitives/Toast';
import { trackEvent } from '@/lib/analytics/events';

export default function DriverRequestsPage() {
  const supabase = createSupabaseBrowserClient();
  const { pushToast } = useToast();

  const [rows, setRows] = useState<Array<{ id: string; status: string; pickup_address: string | null; dropoff_address: string | null }>>([]);

  const load = async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return;

    const { data, error } = await supabase
      .from('ride_requests')
      .select('id,status,pickup_address,dropoff_address')
      .eq('assigned_driver_id', authData.user.id)
      .eq('status', 'matched')
      .order('created_at', { ascending: false });

    if (error) {
      pushToast(error.message, 'error');
      return;
    }

    setRows(data ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const accept = async (requestId: string) => {
    const { data, error } = await supabase.functions.invoke('driver-accept', {
      body: { request_id: requestId },
    });

    if (error) {
      pushToast(error.message, 'error');
      return;
    }

    const rideId = (data as { ride?: { ride_id?: string } })?.ride?.ride_id;
    await trackEvent('accepted', { request_id: requestId, ride_id: rideId });
    pushToast('Request accepted.', 'success');
    await load();
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Incoming requests</Typography>
      </Paper>

      {rows.map((row) => (
        <Paper key={row.id} sx={{ p: 2 }}>
          <Typography variant="subtitle1">Request {row.id.slice(0, 8)}...</Typography>
          <Typography color="text.secondary">
            {row.pickup_address ?? 'Pickup'} {'->'} {row.dropoff_address ?? 'Dropoff'}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button variant="contained" onClick={() => void accept(row.id)}>
              Accept
            </Button>
            <Button component={Link} href={`/driver/active/${row.id}`} variant="outlined">
              Open
            </Button>
          </Stack>
        </Paper>
      ))}

      {rows.length === 0 ? (
        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">No matched requests at the moment.</Typography>
        </Paper>
      ) : null}
    </Stack>
  );
}

