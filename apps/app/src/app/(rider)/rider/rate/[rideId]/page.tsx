'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/Button';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { FormField } from '@/design-system/components/primitives/FormField';
import { useToast } from '@/design-system/components/primitives/Toast';
import { trackEvent } from '@/lib/analytics/events';

export default function RiderRatePage({ params }: { params: Promise<{ rideId: string }> }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { pushToast } = useToast();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const { rideId } = await params;
    setBusy(true);

    const { error } = await supabase.rpc(
      'submit_ride_rating',
      {
        p_ride_id: rideId,
        p_rating: rating,
        p_comment: comment || null,
      } as never,
    );

    setBusy(false);
    if (error) {
      pushToast(error.message, 'error');
      return;
    }

    await trackEvent('rating_submitted', { ride_id: rideId, rating });
    pushToast('Rating submitted.', 'success');
    router.push('/rider/trips');
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Rate your trip</Typography>
        <Typography sx={{ mt: 1 }}>Rating: {rating}</Typography>
        <Slider value={rating} min={1} max={5} step={1} onChange={(_, value) => setRating(value as number)} sx={{ mt: 2 }} />
        <FormField label="Comment" multiline minRows={3} value={comment} onChange={(event) => setComment(event.target.value)} />
        <Button variant="contained" sx={{ mt: 2 }} onClick={submit} disabled={busy}>
          Submit rating
        </Button>
      </Paper>
    </Stack>
  );
}

