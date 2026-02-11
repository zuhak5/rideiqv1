'use client';

import Button from '@mui/material/Button';
import type { ButtonProps } from '@mui/material/Button';

export function PrimaryButton(props: ButtonProps) {
  return <Button variant="contained" fullWidth {...props} />;
}

