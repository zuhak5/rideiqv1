'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { FormField } from '@/design-system/components/primitives/FormField';

export default function RiderPickupPage() {
  const router = useRouter();
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLat, setPickupLat] = useState('33.3152');
  const [pickupLng, setPickupLng] = useState('44.3661');

  const next = () => {
    const params = new URLSearchParams({
      pickupAddress,
      pickupLat,
      pickupLng,
    });
    router.push(`/rider/destination?${params.toString()}`);
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom>
          Pickup
        </Typography>
        <Stack spacing={2}>
          <FormField label="Pickup address" value={pickupAddress} onChange={(event) => setPickupAddress(event.target.value)} />
          <FormField label="Pickup latitude" value={pickupLat} onChange={(event) => setPickupLat(event.target.value)} />
          <FormField label="Pickup longitude" value={pickupLng} onChange={(event) => setPickupLng(event.target.value)} />
          <Button variant="contained" onClick={next} sx={{ minHeight: 44 }}>
            Continue
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}

