import Link from 'next/link';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function MerchantHomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id,business_name,status,business_type')
    .eq('owner_profile_id', user?.id ?? '')
    .maybeSingle();

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Merchant home</Typography>
        <Typography color="text.secondary">Business: {merchant?.business_name ?? 'Not set'}</Typography>
        <Typography color="text.secondary">Status: {merchant?.status ?? 'draft'}</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button component={Link} href="/merchant/profile" variant="contained">
            Edit profile
          </Button>
          <Button component={Link} href="/merchant/chat" variant="outlined">
            Open chat
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}

