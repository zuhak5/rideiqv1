'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { appApi } from '@/lib/api';
import { useToast } from '@/design-system/components/primitives/Toast';
import { trackEvent } from '@/lib/analytics/events';

const roles: Array<{ value: 'rider' | 'driver' | 'merchant'; title: string; description: string }> = [
  { value: 'rider', title: 'Rider', description: 'Book rides and track trips in real time.' },
  { value: 'driver', title: 'Driver', description: 'Go online, accept requests, and complete rides.' },
  { value: 'merchant', title: 'Merchant', description: 'Manage store operations and delivery requests.' },
];

function RolePageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { pushToast } = useToast();
  const [selected, setSelected] = useState<'rider' | 'driver' | 'merchant'>('rider');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const role = params.get('role');
    if (role === 'rider' || role === 'driver' || role === 'merchant') {
      setSelected(role);
    }
  }, [params]);

  const continueFlow = async () => {
    setBusy(true);
    await trackEvent('role_selected', { role: selected });

    if (selected === 'rider') {
      try {
        await appApi.setMyActiveRole('rider');
        router.push('/profile?role=rider');
      } catch (error) {
        pushToast(error instanceof Error ? error.message : String(error), 'error');
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(false);
    router.push(`/profile?role=${selected}`);
  };

  return (
    <Stack sx={{ p: 2, maxWidth: 700, mx: 'auto' }} spacing={2}>
      <Typography variant="h4" component="h1">
        Choose your role
      </Typography>
      <Typography color="text.secondary">Role is enforced from database context, not local storage.</Typography>

      <Stack spacing={2}>
        {roles.map((role) => (
          <Paper
            key={role.value}
            sx={{ p: 2, border: selected === role.value ? '2px solid #0B5FFF' : '1px solid rgba(12,22,45,0.1)', cursor: 'pointer' }}
            onClick={() => setSelected(role.value)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSelected(role.value);
              }
            }}
          >
            <Typography variant="h6">{role.title}</Typography>
            <Typography color="text.secondary">{role.description}</Typography>
          </Paper>
        ))}
      </Stack>

      <Button variant="contained" onClick={continueFlow} disabled={busy} sx={{ minHeight: 44 }}>
        Continue
      </Button>
    </Stack>
  );
}

export default function RolePage() {
  return (
    <Suspense
      fallback={
        <Stack sx={{ p: 2, maxWidth: 700, mx: 'auto' }}>
          <Typography>Loading...</Typography>
        </Stack>
      }
    >
      <RolePageContent />
    </Suspense>
  );
}

