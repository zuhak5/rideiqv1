'use client';

import Alert from '@mui/material/Alert';
import { useEffect, useState } from 'react';

export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (online) return null;

  return (
    <Alert severity="warning" role="status" sx={{ borderRadius: 0 }}>
      You are offline. Mutating actions are disabled until the connection is restored.
    </Alert>
  );
}

