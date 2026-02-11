'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { FormField } from '@/design-system/components/primitives/FormField';
import { PrimaryButton } from '@/design-system/components/primitives/PrimaryButton';
import { useToast } from '@/design-system/components/primitives/Toast';

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { pushToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const signUp = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setBusy(false);

    if (error) {
      pushToast(error.message, 'error');
      return;
    }

    pushToast('Account created. Please sign in.', 'success');
    router.push('/sign-in');
  };

  return (
    <Stack sx={{ minHeight: '100dvh', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper sx={{ width: '100%', maxWidth: 440, p: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Sign up
        </Typography>
        <Stack spacing={2}>
          <FormField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <FormField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <PrimaryButton onClick={signUp} disabled={busy || !email || !password}>
            Create account
          </PrimaryButton>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link href="/sign-in" underline="hover">
              Sign in
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Stack>
  );
}

