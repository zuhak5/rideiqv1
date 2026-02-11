'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { FormField } from '@/design-system/components/primitives/FormField';
import { useToast } from '@/design-system/components/primitives/Toast';

function RiderSafetyPageContent() {
  const searchParams = useSearchParams();
  const rideId = useMemo(() => searchParams.get('rideId') ?? '', [searchParams]);

  const supabase = createSupabaseBrowserClient();
  const { pushToast } = useToast();

  const [reportUserId, setReportUserId] = useState('');
  const [reportType, setReportType] = useState<'mismatch' | 'harassment' | 'safety_concern' | 'other'>('safety_concern');
  const [description, setDescription] = useState('');
  const [eventId, setEventId] = useState('');

  const triggerSos = async () => {
    if (!rideId) {
      pushToast('rideId is required for SOS.', 'error');
      return;
    }

    const { error } = await supabase.functions.invoke('safety-sos', {
      body: {
        ride_id: rideId,
      },
    });

    if (error) {
      pushToast(error.message, 'error');
      return;
    }

    pushToast('SOS sent.', 'success');
  };

  const submitSafetyReport = async () => {
    const { error } = await supabase.functions.invoke('safety-report', {
      body: {
        reported_user_id: reportUserId,
        ride_id: rideId || undefined,
        report_type: reportType,
        description: description || undefined,
      },
    });

    if (error) {
      pushToast(error.message, 'error');
      return;
    }

    pushToast('Safety report submitted.', 'success');
    setDescription('');
    setReportUserId('');
  };

  const respondRidecheck = async (response: 'ok' | 'false_alarm' | 'need_help') => {
    if (!eventId) {
      pushToast('RideCheck event id is required.', 'error');
      return;
    }

    const { error } = await supabase.functions.invoke('ridecheck-respond', {
      body: {
        event_id: eventId,
        response,
      },
    });

    if (error) {
      pushToast(error.message, 'error');
      return;
    }

    pushToast(`RideCheck response submitted: ${response}`, 'success');
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Safety tools</Typography>
        <Typography color="text.secondary">Ride: {rideId || 'not selected'}</Typography>
        <Button variant="contained" color="error" onClick={triggerSos} sx={{ mt: 2 }}>
          Trigger SOS
        </Button>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Report user</Typography>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormField label="Reported user id" value={reportUserId} onChange={(event) => setReportUserId(event.target.value)} />
          <FormField label="Report type" value={reportType} onChange={(event) => setReportType(event.target.value as typeof reportType)} />
          <FormField label="Description" value={description} multiline minRows={3} onChange={(event) => setDescription(event.target.value)} />
          <Button variant="outlined" onClick={submitSafetyReport} disabled={!reportUserId}>
            Submit report
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">RideCheck response</Typography>
        <FormField label="RideCheck event id" value={eventId} onChange={(event) => setEventId(event.target.value)} sx={{ mt: 1 }} />
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={() => respondRidecheck('ok')}>
            I am safe
          </Button>
          <Button variant="outlined" onClick={() => respondRidecheck('false_alarm')}>
            False alarm
          </Button>
          <Button variant="contained" color="error" onClick={() => respondRidecheck('need_help')}>
            Need help
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}

export default function RiderSafetyPage() {
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
      <RiderSafetyPageContent />
    </Suspense>
  );
}

