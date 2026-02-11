import Link from 'next/link';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function RiderReceiptPage({ params }: { params: Promise<{ rideId: string }> }) {
  const { rideId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: ride } = await supabase
    .from('rides')
    .select('id,status,fare_amount_iqd,currency,started_at,completed_at')
    .eq('id', rideId)
    .maybeSingle();

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Receipt</Typography>
        <Typography color="text.secondary">Ride: {ride?.id ?? rideId}</Typography>
        <Typography>Status: {ride?.status ?? 'unknown'}</Typography>
        <Typography>Fare: {ride?.fare_amount_iqd?.toLocaleString() ?? '-'} {ride?.currency ?? 'IQD'}</Typography>
        <Typography color="text.secondary">Started: {ride?.started_at ?? '-'}</Typography>
        <Typography color="text.secondary">Completed: {ride?.completed_at ?? '-'}</Typography>

        <Button component={Link} href={`/rider/rate/${rideId}`} variant="contained" sx={{ mt: 2 }}>
          Rate trip
        </Button>
      </Paper>
    </Stack>
  );
}

