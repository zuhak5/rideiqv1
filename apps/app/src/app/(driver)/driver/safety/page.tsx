'use client';

import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { FormField } from '@/design-system/components/primitives/FormField';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/design-system/components/primitives/Toast';

export default function DriverSafetyPage() {
  const supabase = createSupabaseBrowserClient();
  const { pushToast } = useToast();

  const [rideId, setRideId] = useState('');
  const [reportedUserId, setReportedUserId] = useState('');
  const [description, setDescription] = useState('');

  const triggerSos = async () => {
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

  const report = async () => {
    const { error } = await supabase.functions.invoke('safety-report', {
      body: {
        reported_user_id: reportedUserId,
        ride_id: rideId || undefined,
        report_type: 'safety_concern',
        description: description || undefined,
      },
    });

    if (error) {
      pushToast(error.message, 'error');
      return;
    }
    pushToast('Safety report submitted.', 'success');
    setDescription('');
    setReportedUserId('');
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Driver safety</Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <FormField label="Ride id" value={rideId} onChange={(event) => setRideId(event.target.value)} />
          <Button variant="contained" color="error" onClick={triggerSos} disabled={!rideId}>
            Trigger SOS
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Report incident</Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <FormField label="Reported user id" value={reportedUserId} onChange={(event) => setReportedUserId(event.target.value)} />
          <FormField label="Description" multiline minRows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
          <Button variant="outlined" onClick={report} disabled={!reportedUserId}>
            Submit report
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}

