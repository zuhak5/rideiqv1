'use client';

import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { FormField } from '@/design-system/components/primitives/FormField';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/design-system/components/primitives/Toast';

export default function MerchantSupportPage() {
  const supabase = createSupabaseBrowserClient();
  const { pushToast } = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const submit = async () => {
    const { data, error } = await supabase.rpc(
      'support_ticket_create_user_v1',
      {
        p_role_context: 'merchant',
        p_subject: subject,
        p_message: message,
        p_category_key: null,
        p_category_code: null,
        p_ride_id: null,
        p_priority: 'normal',
      } as never,
    );

    if (error) {
      pushToast(error.message, 'error');
      return;
    }

    if (!(data as { ok?: boolean })?.ok) {
      pushToast('Unable to create support ticket.', 'error');
      return;
    }

    pushToast('Support ticket created.', 'success');
    setSubject('');
    setMessage('');
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Merchant support</Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <FormField label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
          <FormField label="Message" multiline minRows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
          <Button variant="contained" onClick={submit} disabled={!subject || !message}>
            Create ticket
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}

