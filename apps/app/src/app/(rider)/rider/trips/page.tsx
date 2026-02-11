import Link from 'next/link';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function RiderTripsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rides } = await supabase
    .from('rides')
    .select('id,status,created_at,fare_amount_iqd,currency')
    .eq('rider_id', user?.id ?? '')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Trips</Typography>
      </Paper>

      {(rides ?? []).map((ride) => (
        <Paper key={ride.id} sx={{ p: 2 }}>
          <Typography variant="subtitle1">Ride {ride.id.slice(0, 8)}...</Typography>
          <Typography color="text.secondary">Status: {ride.status}</Typography>
          <Typography color="text.secondary">
            Fare: {ride.fare_amount_iqd?.toLocaleString() ?? '-'} {ride.currency}
          </Typography>
          <Button component={Link} href={`/rider/trips/${ride.id}`} sx={{ mt: 1 }}>
            Open details
          </Button>
        </Paper>
      ))}

      {(rides ?? []).length === 0 ? (
        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">No trips yet.</Typography>
        </Paper>
      ) : null}
    </Stack>
  );
}

