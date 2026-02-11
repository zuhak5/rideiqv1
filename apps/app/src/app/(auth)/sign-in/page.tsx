'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { FormField } from '@/design-system/components/primitives/FormField';
import { PrimaryButton } from '@/design-system/components/primitives/PrimaryButton';
import { useToast } from '@/design-system/components/primitives/Toast';
import { trackEvent } from '@/lib/analytics/events';

export default function SignInPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { pushToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const signInWithPassword = async () => {
    setBusy(true);
    await trackEvent('auth_started', { method: 'password' });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (error) {
      pushToast(error.message, 'error');
      return;
    }

    await trackEvent('auth_completed', { method: 'password' });
    router.push('/role');
  };

  const requestOtp = async () => {
    setBusy(true);
    await trackEvent('auth_started', { method: 'otp' });
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);

    if (error) {
      pushToast(error.message, 'error');
      return;
    }

    setOtpSent(true);
    pushToast('OTP code sent.', 'success');
  };

  const verifyOtp = async () => {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    });
    setBusy(false);

    if (error) {
      pushToast(error.message, 'error');
      return;
    }

    await trackEvent('auth_completed', { method: 'otp' });
    router.push('/role');
  };

  return (
    <Stack sx={{ minHeight: '100dvh', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper sx={{ width: '100%', maxWidth: 440, p: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Sign in
        </Typography>

        <Stack spacing={2}>
          <FormField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <FormField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <PrimaryButton onClick={signInWithPassword} disabled={busy || !email || !password}>
            Continue with Email
          </PrimaryButton>

          <Divider>OR</Divider>

          <FormField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+9647XXXXXXXX" />
          {otpSent ? (
            <FormField label="One-time code" value={otp} onChange={(e) => setOtp(e.target.value)} />
          ) : null}
          {!otpSent ? (
            <PrimaryButton onClick={requestOtp} disabled={busy || !phone}>
              Send OTP
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={verifyOtp} disabled={busy || !otp}>
              Verify OTP
            </PrimaryButton>
          )}

          <Typography variant="body2" color="text.secondary">
            New here?{' '}
            <Link href="/sign-up" underline="hover">
              Create an account
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Stack>
  );
}

