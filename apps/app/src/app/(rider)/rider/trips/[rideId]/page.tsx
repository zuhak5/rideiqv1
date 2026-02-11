import Link from 'next/link';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function RiderTripDetailPage({ params }: { params: Promise<{ rideId: string }> }) {
  const { rideId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: ride } = await supabase
    .from('rides')
    .select('id,status,request_id,created_at,started_at,completed_at,fare_amount_iqd,currency')
    .eq('id', rideId)
    .maybeSingle();

  const { data: request } = await supabase
    .from('ride_requests')
    .select('id,status,pickup_address,dropoff_address,pickup_lat,pickup_lng,dropoff_lat,dropoff_lng')
    .eq('id', ride?.request_id ?? '')
    .maybeSingle();

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Trip detail</Typography>
        <Typography color="text.secondary">Ride id: {ride?.id ?? rideId}</Typography>
        <Typography>Status: {ride?.status ?? 'unknown'}</Typography>
        <Typography>
          Fare: {ride?.fare_amount_iqd?.toLocaleString() ?? '-'} {ride?.currency ?? 'IQD'}
        </Typography>
        <Typography color="text.secondary">Started: {ride?.started_at ?? '-'}</Typography>
        <Typography color="text.secondary">Completed: {ride?.completed_at ?? '-'}</Typography>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Request</Typography>
        <Typography color="text.secondary">Status: {request?.status ?? '-'}</Typography>
        <Typography color="text.secondary">Pickup: {request?.pickup_address ?? `${request?.pickup_lat}, ${request?.pickup_lng}`}</Typography>
        <Typography color="text.secondary">Dropoff: {request?.dropoff_address ?? `${request?.dropoff_lat}, ${request?.dropoff_lng}`}</Typography>
      </Paper>

      <Button component={Link} href={`/rider/rate/${rideId}`} variant="contained">
        Rate this ride
      </Button>
    </Stack>
  );
}

