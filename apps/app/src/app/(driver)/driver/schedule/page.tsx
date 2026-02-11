'use client';

import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { FormField } from '@/design-system/components/primitives/FormField';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/design-system/components/primitives/Toast';

export default function DriverSchedulePage() {
  const supabase = createSupabaseBrowserClient();
  const { pushToast } = useToast();

  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [shifts, setShifts] = useState<Array<{ id: string; scheduled_start: string; scheduled_end: string; status: string }>>([]);

  const load = async () => {
    const { data, error } = await supabase.functions.invoke('shift-planner');
    if (error) {
      pushToast(error.message, 'error');
      return;
    }
    const rows = ((data as { shifts?: unknown[] })?.shifts ?? []) as Array<{ id: string; scheduled_start: string; scheduled_end: string; status: string }>;
    setShifts(rows);
  };

  useEffect(() => {
    void load();
  }, []);

  const createShift = async () => {
    const { error } = await supabase.functions.invoke('shift-planner', {
      body: {
        scheduled_start: new Date(startAt).toISOString(),
        scheduled_end: new Date(endAt).toISOString(),
      },
    });

    if (error) {
      pushToast(error.message, 'error');
      return;
    }

    pushToast('Shift created.', 'success');
    await load();
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Shift planner</Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <FormField type="datetime-local" label="Start" value={startAt} onChange={(event) => setStartAt(event.target.value)} InputLabelProps={{ shrink: true }} />
          <FormField type="datetime-local" label="End" value={endAt} onChange={(event) => setEndAt(event.target.value)} InputLabelProps={{ shrink: true }} />
          <Button variant="contained" onClick={createShift} disabled={!startAt || !endAt}>
            Save shift
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Upcoming shifts</Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {shifts.map((shift) => (
            <Paper key={shift.id} variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="subtitle2">{new Date(shift.scheduled_start).toLocaleString()} ? {new Date(shift.scheduled_end).toLocaleString()}</Typography>
              <Typography color="text.secondary">{shift.status}</Typography>
            </Paper>
          ))}
          {shifts.length === 0 ? <Typography color="text.secondary">No shifts scheduled.</Typography> : null}
        </Stack>
      </Paper>
    </Stack>
  );
}

