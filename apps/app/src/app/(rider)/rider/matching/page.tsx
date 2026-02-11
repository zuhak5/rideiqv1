'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { appApi } from '@/lib/api';
import { realtimeManager } from '@/lib/realtime/manager';
import { trackEvent } from '@/lib/analytics/events';

function RiderMatchingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const requestId = searchParams.get('requestId');

  const [status, setStatus] = useState<string>('requested');
  const [assignedDriverId, setAssignedDriverId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryRequest = async () => {
    if (!requestId) return;
    const { data, error: dbError } = await supabase
      .from('ride_requests')
      .select('status,assigned_driver_id')
      .eq('id', requestId)
      .maybeSingle();

    if (dbError) {
      setError(dbError.message);
      return;
    }

    setStatus(data?.status ?? 'requested');
    setAssignedDriverId(data?.assigned_driver_id ?? null);
  };

  useEffect(() => {
    void queryRequest();
  }, [requestId]);

  useEffect(() => {
    if (!requestId) return;
    const unsubscribe = realtimeManager.subscribe({
      key: `rider-request-${requestId}`,
      table: 'ride_requests',
      filter: `id=eq.${requestId}`,
      onChange: queryRequest,
    });

    return () => unsubscribe();
  }, [requestId]);

  const startMatching = async () => {
    if (!requestId) return;
    setBusy(true);
    setError(null);

    try {
      await trackEvent('matching_started', { request_id: requestId });
      const response = await appApi.matchRide({ request_id: requestId, radius_m: 5000, limit_n: 20 });
      setStatus(response.request?.status ?? 'requested');
      setAssignedDriverId(response.request?.assigned_driver_id ?? null);
      if (response.request?.assigned_driver_id) {
        await trackEvent('driver_assigned', {
          request_id: requestId,
          driver_id: response.request.assigned_driver_id,
        });
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setBusy(false);
    }
  };

  const nextPath = useMemo(() => {
    if (!requestId) return null;
    if (status === 'accepted') return `/rider/en-route/${requestId}`;
    return null;
  }, [requestId, status]);

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Matching</Typography>
        <Typography sx={{ mt: 1 }} color="text.secondary">
          Request: {requestId ?? 'missing'}
        </Typography>
        <Typography>Status: {status}</Typography>
        <Typography color="text.secondary">Assigned driver: {assignedDriverId ?? 'none'}</Typography>
        {error ? <Typography color="error.main">{error}</Typography> : null}

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={startMatching} disabled={busy || !requestId}>
            Find driver
          </Button>
          <Button variant="outlined" onClick={queryRequest} disabled={!requestId}>
            Refresh
          </Button>
          {nextPath ? (
            <Button variant="text" onClick={() => router.push(nextPath as Route)}>
              Continue
            </Button>
          ) : null}
        </Stack>
      </Paper>
    </Stack>
  );
}

export default function RiderMatchingPage() {
  return (
    <Suspense
      fallback={
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Typography>Loading...</Typography>
          </Paper>
        </Stack>
      }
    >
      <RiderMatchingPageContent />
    </Suspense>
  );
}

