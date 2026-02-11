'use client';

import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { FormField } from '@/design-system/components/primitives/FormField';
import { useToast } from '@/design-system/components/primitives/Toast';

export default function RiderSupportPage() {
  const supabase = createSupabaseBrowserClient();
  const { pushToast } = useToast();

  const [categories, setCategories] = useState<Array<{ key: string; label: string }>>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [categoryKey, setCategoryKey] = useState('');
  const [tickets, setTickets] = useState<Array<{ id: string; status: string; subject: string; created_at: string }>>([]);

  const load = async () => {
    const { data: categoryData, error: categoryError } = await supabase.rpc('support_categories_list_user_v1');
    if (!categoryError && categoryData && typeof categoryData === 'object') {
      const rows = Array.isArray((categoryData as { categories?: unknown[] }).categories)
        ? ((categoryData as { categories: Array<{ key?: string; label?: string }> }).categories ?? [])
        : [];
      setCategories(rows.map((row) => ({ key: row.key ?? '', label: row.label ?? row.key ?? '' })).filter((row) => row.key));
    }

    const { data: ticketsData, error: ticketsError } = await supabase.rpc(
      'support_ticket_list_user_v1',
      {
        p_status: null,
        p_limit: 20,
        p_offset: 0,
      } as never,
    );

    if (!ticketsError && ticketsData && typeof ticketsData === 'object') {
      const rows = Array.isArray((ticketsData as { tickets?: unknown[] }).tickets)
        ? ((ticketsData as { tickets: Array<{ id: string; status: string; subject: string; created_at: string }> }).tickets ?? [])
        : [];
      setTickets(rows);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createTicket = async () => {
    const { data, error } = await supabase.rpc(
      'support_ticket_create_user_v1',
      {
        p_role_context: 'rider',
        p_subject: subject,
        p_message: message,
        p_category_key: categoryKey || null,
        p_category_code: null,
        p_ride_id: null,
        p_priority: 'normal',
      } as never,
    );

    if (error) {
      pushToast(error.message, 'error');
      return;
    }

    const ok = data && typeof data === 'object' ? (data as { ok?: boolean }).ok : false;
    if (!ok) {
      pushToast('Ticket creation failed.', 'error');
      return;
    }

    pushToast('Support ticket created.', 'success');
    setSubject('');
    setMessage('');
    setCategoryKey('');
    await load();
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Support</Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <FormField label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
          <FormField label="Message" value={message} onChange={(event) => setMessage(event.target.value)} multiline minRows={3} />
          <FormField select label="Category" value={categoryKey} onChange={(event) => setCategoryKey(event.target.value)}>
            <MenuItem value="">General</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category.key} value={category.key}>
                {category.label}
              </MenuItem>
            ))}
          </FormField>
          <Button variant="contained" onClick={createTicket} disabled={!subject || !message}>
            Create ticket
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Your tickets</Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {tickets.map((ticket) => (
            <Paper key={ticket.id} variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="subtitle2">{ticket.subject}</Typography>
              <Typography variant="body2" color="text.secondary">
                {ticket.status} • {new Date(ticket.created_at).toLocaleString()}
              </Typography>
            </Paper>
          ))}
          {tickets.length === 0 ? <Typography color="text.secondary">No tickets yet.</Typography> : null}
        </Stack>
      </Paper>
    </Stack>
  );
}

