import Link from 'next/link';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NearbyDriversCard } from '@/features/rider/NearbyDriversCard';

export default async function RiderHomePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc('get_my_app_context');
  const context = Array.isArray(data) ? data[0] : data;

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Book a ride</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Start your ride flow with pickup and destination.
        </Typography>
        <Button component={Link} href="/rider/pickup" variant="contained" sx={{ mt: 2, minHeight: 44 }}>
          Start ride
        </Button>
      </Paper>

      <NearbyDriversCard pickupLat={33.3152} pickupLng={44.3661} />

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Profile context</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Active role: {context?.active_role ?? 'rider'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Locale: {context?.locale ?? 'en'}
        </Typography>
      </Paper>
    </Stack>
  );
}

