'use client';

import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

export function AppScaffold({
  topBar,
  children,
  bottomBar,
}: {
  topBar?: ReactNode;
  children: ReactNode;
  bottomBar?: ReactNode;
}) {
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', pb: bottomBar ? 10 : 0 }}>
      {topBar}
      <Box component="main" sx={{ maxWidth: 1120, mx: 'auto', px: 2, py: 2 }}>
        {children}
      </Box>
      {bottomBar}
    </Box>
  );
}

