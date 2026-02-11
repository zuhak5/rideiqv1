'use client';

import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

export function Sheet({
  open,
  onClose,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
}) {
  return (
    <Drawer anchor="bottom" open={open} onClose={onClose} ModalProps={{ keepMounted: true }}>
      <Box
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        sx={{ p: 2, maxHeight: '80dvh', overflowY: 'auto' }}
      >
        {children}
      </Box>
    </Drawer>
  );
}

