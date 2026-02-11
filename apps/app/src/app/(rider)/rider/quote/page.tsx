'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { appApi } from '@/lib/api';
import { useToast } from '@/design-system/components/primitives/Toast';

function RiderQuotePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();

  const pickupLat = Number(searchParams.get('pickupLat'));
  const pickupLng = Number(searchParams.get('pickupLng'));
  const dropoffLat = Number(searchParams.get('dropoffLat'));
  const dropoffLng = Number(searchParams.get('dropoffLng'));
  const productCode = searchParams.get('productCode') ?? 'standard';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof appApi.getFareQuote>> | null>(null);

  useEffect(() => {
    let mounted = true;

    if (![pickupLat, pickupLng, dropoffLat, dropoffLng].every((value) => Number.isFinite(value))) {
      setError('Invalid trip coordinates.');
      setLoading(false);
      return;
    }

    void appApi
      .getFareQuote({
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        dropoff_lat: dropoffLat,
        dropoff_lng: dropoffLng,
        product_code: productCode,
      })
      .then((result) => {
        if (!mounted) return;
        setQuote(result);
      })
      .catch((nextError: unknown) => {
        if (!mounted) return;
        setError(nextError instanceof Error ? nextError.message : String(nextError));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, productCode]);

  const quoteTotal = useMemo(() => quote?.quote.total_iqd ?? 0, [quote]);

  const proceed = () => {
    if (!quote?.quote_id) {
      pushToast('No quote id returned by fare-engine.', 'error');
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('quoteId', quote.quote_id);
    params.set('quoteAmountIqd', String(quoteTotal));
    router.push(`/rider/confirm?${params.toString()}`);
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Fare quote</Typography>
        {loading ? <Typography sx={{ mt: 1 }}>Calculating quote...</Typography> : null}
        {error ? (
          <Typography sx={{ mt: 1 }} color="error.main">
            {error}
          </Typography>
        ) : null}
        {quote ? (
          <>
            <Typography sx={{ mt: 1 }}>Total: {quote.quote.total_iqd.toLocaleString()} IQD</Typography>
            <Typography color="text.secondary">Distance: {quote.quote.distance_km.toFixed(2)} km</Typography>
            <Typography color="text.secondary">Duration: {quote.quote.duration_min.toFixed(1)} min</Typography>
            <Button variant="contained" sx={{ mt: 2, minHeight: 44 }} onClick={proceed}>
              Continue
            </Button>
          </>
        ) : null}
      </Paper>
    </Stack>
  );
}

export default function RiderQuotePage() {
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
      <RiderQuotePageContent />
    </Suspense>
  );
}

