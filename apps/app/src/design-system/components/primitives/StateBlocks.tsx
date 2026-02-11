'use client';

import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <Paper sx={{ p: 3, textAlign: 'center' }}>
      <Typography variant="h6">{title}</Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {description}
        </Typography>
      ) : null}
      {action ? <div style={{ marginTop: 16 }}>{action}</div> : null}
    </Paper>
  );
}

export function ErrorState({ title, description, onRetry }: { title: string; description?: string; onRetry?: () => void }) {
  return (
    <Paper sx={{ p: 3, textAlign: 'center', border: '1px solid rgba(186,26,26,0.25)' }}>
      <Typography variant="h6" color="error.main">
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {description}
        </Typography>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          style={{ marginTop: 12, minHeight: 44, paddingInline: 16, borderRadius: 12, border: '1px solid #d7dbe6' }}
        >
          Retry
        </button>
      ) : null}
    </Paper>
  );
}

