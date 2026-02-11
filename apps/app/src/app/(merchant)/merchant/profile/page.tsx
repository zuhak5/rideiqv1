'use client';

import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { FormField } from '@/design-system/components/primitives/FormField';
import { useToast } from '@/design-system/components/primitives/Toast';
import { appApi } from '@/lib/api';

export default function MerchantProfilePage() {
  const supabase = createSupabaseBrowserClient();
  const { pushToast } = useToast();

  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('restaurant');

  useEffect(() => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data } = await supabase
        .from('merchants')
        .select('id,business_name,business_type')
        .eq('owner_profile_id', authData.user.id)
        .maybeSingle();

      if (!data) return;
      setMerchantId(data.id);
      setBusinessName(data.business_name ?? '');
      setBusinessType(data.business_type ?? 'restaurant');
    })();
  }, [supabase]);

  const save = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      pushToast('Not authenticated.', 'error');
      return;
    }

    if (merchantId) {
      const { error } = await supabase
        .from('merchants')
        .update({ business_name: businessName, business_type: businessType })
        .eq('id', merchantId);
      if (error) {
        pushToast(error.message, 'error');
        return;
      }
    } else {
      const { data, error } = await supabase
        .from('merchants')
        .insert({
          owner_profile_id: authData.user.id,
          business_name: businessName,
          business_type: businessType,
          status: 'pending',
        })
        .select('id')
        .single();

      if (error) {
        pushToast(error.message, 'error');
        return;
      }
      setMerchantId(data.id);
    }

    await appApi.setMyActiveRole('merchant');
    pushToast('Merchant profile saved.', 'success');
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Merchant profile</Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <FormField label="Business name" value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
          <FormField label="Business type" value={businessType} onChange={(event) => setBusinessType(event.target.value)} />
          <Button variant="contained" onClick={save} disabled={!businessName}>
            Save profile
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}

