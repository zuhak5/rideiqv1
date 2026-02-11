'use client';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

export function TopBar({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid rgba(12,22,45,0.08)' }}>
      <Toolbar sx={{ minHeight: 64 }}>
        <Typography component="h1" variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Box sx={{ ml: 'auto' }}>{action}</Box>
      </Toolbar>
    </AppBar>
  );
}

