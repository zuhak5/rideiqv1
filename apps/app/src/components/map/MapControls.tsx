'use client';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

export function MapControls({ onRecenter }: { onRecenter?: () => void }) {
  return (
    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
      <Button variant="outlined" onClick={onRecenter} sx={{ minHeight: 44 }}>
        Recenter
      </Button>
    </Stack>
  );
}

