'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { FormField } from '@/design-system/components/primitives/FormField';
import { useToast } from '@/design-system/components/primitives/Toast';
import { trackEvent } from '@/lib/analytics/events';

function RiderConfirmPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const { pushToast } = useToast();

  const pickupLat = Number(params.get('pickupLat'));
  const pickupLng = Number(params.get('pickupLng'));
  const dropoffLat = Number(params.get('dropoffLat'));
  const dropoffLng = Number(params.get('dropoffLng'));

  const pickupAddress = params.get('pickupAddress');
  const dropoffAddress = params.get('dropoffAddress');
  const quoteId = params.get('quoteId');
  const quoteAmount = Number(params.get('quoteAmountIqd'));
  const productCode = params.get('productCode') ?? 'standard';

  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'cash'>('wallet');
  const [busy, setBusy] = useState(false);

  const isValid = useMemo(() => {
    return [pickupLat, pickupLng, dropoffLat, dropoffLng, quoteAmount].every((value) => Number.isFinite(value)) && Boolean(quoteId);
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, quoteAmount, quoteId]);

  const submit = async () => {
    if (!isValid || !quoteId) {
      pushToast('Missing quote details.', 'error');
      return;
    }

    setBusy(true);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      pushToast('Not authenticated.', 'error');
      setBusy(false);
      return;
    }

    const { data, error } = await supabase
      .from('ride_requests')
      .insert({
        rider_id: authData.user.id,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        dropoff_lat: dropoffLat,
        dropoff_lng: dropoffLng,
        pickup_address: pickupAddress || null,
        dropoff_address: dropoffAddress || null,
        product_code: productCode,
        fare_quote_id: quoteId,
        quote_amount_iqd: Math.trunc(quoteAmount),
        currency: 'IQD',
        payment_method: paymentMethod,
      })
      .select('id')
      .single();

    setBusy(false);

    if (error || !data?.id) {
      pushToast(error?.message ?? 'Failed to create request.', 'error');
      return;
    }

    await trackEvent('request_created', { request_id: data.id });
    router.push(`/rider/matching?requestId=${data.id}`);
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Confirm ride</Typography>
        <Typography sx={{ mt: 1 }}>Quote: {Number.isFinite(quoteAmount) ? quoteAmount.toLocaleString() : '-'} IQD</Typography>
        <FormField
          select
          label="Payment method"
          sx={{ mt: 2 }}
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value as 'wallet' | 'cash')}
        >
          <MenuItem value="wallet">Wallet</MenuItem>
          <MenuItem value="cash">Cash</MenuItem>
        </FormField>
        <Button variant="contained" sx={{ mt: 2, minHeight: 44 }} onClick={submit} disabled={busy || !isValid}>
          Request ride
        </Button>
      </Paper>
    </Stack>
  );
}

export default function RiderConfirmPage() {
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
      <RiderConfirmPageContent />
    </Suspense>
  );
}

