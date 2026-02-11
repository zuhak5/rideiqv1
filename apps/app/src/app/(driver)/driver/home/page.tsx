'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/design-system/components/primitives/Toast';
import { trackEvent } from '@/lib/analytics/events';

export default function DriverHomePage() {
  const supabase = createSupabaseBrowserClient();
  const { pushToast } = useToast();

  const [driver, setDriver] = useState<{ id: string; status: string; vehicle_type: string | null } | null>(null);
  const [kyc, setKyc] = useState<{ status: string } | null>(null);

  const load = async () => {
    const { data: driverData } = await supabase.from('drivers').select('id,status,vehicle_type').maybeSingle();
    setDriver(driverData ?? null);

    const { data: kycData } = await supabase.from('profile_kyc').select('status').maybeSingle();
    setKyc(kycData ?? null);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleOnline = async () => {
    if (!driver?.id) {
      pushToast('Driver profile missing. Complete onboarding profile first.', 'error');
      return;
    }

    const nextStatus = driver.status === 'available' ? 'offline' : 'available';

    if (nextStatus === 'available' && kyc?.status !== 'verified') {
      pushToast('KYC verification is required before going online.', 'warning');
      return;
    }

    const { error } = await supabase.from('drivers').update({ status: nextStatus }).eq('id', driver.id);
    if (error) {
      pushToast(error.message, 'error');
      return;
    }

    if (nextStatus === 'available') {
      await trackEvent('went_online', { role: 'driver' });
    }

    await load();
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Driver home</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Manage availability, location, and incoming ride requests.
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
          <Chip label={`Driver: ${driver ? 'ready' : 'not configured'}`} />
          <Chip label={`Status: ${driver?.status ?? 'offline'}`} />
          <Chip label={`KYC: ${kyc?.status ?? 'unverified'}`} />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={toggleOnline}>
            {driver?.status === 'available' ? 'Go offline' : 'Go online'}
          </Button>
          <Button component={Link} href="/driver/location" variant="outlined">
            Location updates
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}

