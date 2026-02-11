'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { FormField } from '@/design-system/components/primitives/FormField';

function RiderDestinationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pickupLat = useMemo(() => searchParams.get('pickupLat') ?? '', [searchParams]);
  const pickupLng = useMemo(() => searchParams.get('pickupLng') ?? '', [searchParams]);
  const pickupAddress = useMemo(() => searchParams.get('pickupAddress') ?? '', [searchParams]);

  const [dropoffAddress, setDropoffAddress] = useState('');
  const [dropoffLat, setDropoffLat] = useState('33.3500');
  const [dropoffLng, setDropoffLng] = useState('44.4300');

  const next = () => {
    const params = new URLSearchParams({
      pickupAddress,
      pickupLat,
      pickupLng,
      dropoffAddress,
      dropoffLat,
      dropoffLng,
      productCode: 'standard',
    });
    router.push(`/rider/quote?${params.toString()}`);
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom>
          Destination
        </Typography>
        <Stack spacing={2}>
          <FormField label="Dropoff address" value={dropoffAddress} onChange={(event) => setDropoffAddress(event.target.value)} />
          <FormField label="Dropoff latitude" value={dropoffLat} onChange={(event) => setDropoffLat(event.target.value)} />
          <FormField label="Dropoff longitude" value={dropoffLng} onChange={(event) => setDropoffLng(event.target.value)} />
          <Button variant="contained" onClick={next} sx={{ minHeight: 44 }}>
            Continue to quote
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}

export default function RiderDestinationPage() {
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
      <RiderDestinationPageContent />
    </Suspense>
  );
}

