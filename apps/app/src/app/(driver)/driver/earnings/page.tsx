'use client';

import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function DriverEarningsPage() {
  const supabase = createSupabaseBrowserClient();
  const [balance, setBalance] = useState<number | null>(null);
  const [entries, setEntries] = useState<Array<{ id: string; delta_iqd: number; reason: string; created_at: string }>>([]);

  useEffect(() => {
    void (async () => {
      const { data: account } = await supabase.rpc('driver_settlement_get_my_account_v1');
      const accountRow = Array.isArray(account) ? account[0] : null;
      setBalance(accountRow?.balance_iqd ?? null);

      const { data: list } = await supabase.rpc('driver_settlement_list_entries_v1', { p_limit: 20, p_offset: 0 });
      setEntries((list ?? []) as Array<{ id: string; delta_iqd: number; reason: string; created_at: string }>);
    })();
  }, [supabase]);

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Earnings</Typography>
        <Typography color="text.secondary">Current balance: {balance?.toLocaleString() ?? '-'} IQD</Typography>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Recent entries</Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {entries.map((entry) => (
            <Paper key={entry.id} variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="subtitle2">{entry.reason}</Typography>
              <Typography color="text.secondary">{entry.delta_iqd.toLocaleString()} IQD</Typography>
            </Paper>
          ))}
          {entries.length === 0 ? <Typography color="text.secondary">No entries yet.</Typography> : null}
        </Stack>
      </Paper>
    </Stack>
  );
}

