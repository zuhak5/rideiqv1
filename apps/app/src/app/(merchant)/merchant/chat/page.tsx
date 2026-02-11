'use client';

import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { FormField } from '@/design-system/components/primitives/FormField';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/design-system/components/primitives/Toast';
import { trackEvent } from '@/lib/analytics/events';

export default function MerchantChatPage() {
  const supabase = createSupabaseBrowserClient();
  const { pushToast } = useToast();

  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; body: string; created_at: string }>>([]);
  const [body, setBody] = useState('');

  const load = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;

    const { data: merchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('owner_profile_id', authData.user.id)
      .maybeSingle();

    if (!merchant?.id) return;
    setMerchantId(merchant.id);

    const { data: threadData, error: threadError } = await supabase.rpc('merchant_chat_get_or_create_thread', {
      p_merchant_id: merchant.id,
    });

    if (threadError || !threadData) {
      pushToast(threadError?.message ?? 'Unable to open chat thread.', 'error');
      return;
    }

    const currentThreadId = threadData as string;
    setThreadId(currentThreadId);

    const { data: messageData, error: messageError } = await supabase.rpc(
      'merchant_chat_list_messages',
      {
        p_thread_id: currentThreadId,
        p_limit: 50,
        p_before_created_at: null,
        p_before_id: null,
      } as never,
    );

    if (messageError) {
      pushToast(messageError.message, 'error');
      return;
    }

    setMessages((messageData ?? []) as Array<{ id: string; body: string; created_at: string }>);

    await trackEvent('chat_opened', { role: 'merchant', thread_id: currentThreadId });
  };

  useEffect(() => {
    void load();
  }, []);

  const send = async () => {
    if (!threadId || !body.trim()) return;

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;

    const { error } = await supabase.from('merchant_chat_messages').insert({
      thread_id: threadId,
      sender_id: authData.user.id,
      body: body.trim(),
      message_type: 'text',
      attachments: [],
    });

    if (error) {
      pushToast(error.message, 'error');
      return;
    }

    setBody('');
    await load();
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Merchant chat</Typography>
        <Typography color="text.secondary">Merchant: {merchantId ?? 'not configured'}</Typography>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Messages</Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {messages.map((message) => (
            <Paper key={message.id} variant="outlined" sx={{ p: 1.5 }}>
              <Typography>{message.body}</Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(message.created_at).toLocaleString()}
              </Typography>
            </Paper>
          ))}
          {messages.length === 0 ? <Typography color="text.secondary">No messages yet.</Typography> : null}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <FormField label="Message" value={body} onChange={(event) => setBody(event.target.value)} multiline minRows={2} />
        <Button variant="contained" sx={{ mt: 2 }} onClick={send} disabled={!threadId || !body.trim()}>
          Send
        </Button>
      </Paper>
    </Stack>
  );
}

