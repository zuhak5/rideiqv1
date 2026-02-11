'use client';

import TextField from '@mui/material/TextField';
import type { TextFieldProps } from '@mui/material/TextField';

export function FormField(props: TextFieldProps & { errorText?: string | null }) {
  const { errorText, ...rest } = props;
  return (
    <TextField
      fullWidth
      error={Boolean(errorText || rest.error)}
      helperText={errorText ?? rest.helperText}
      FormHelperTextProps={{
        'aria-live': 'polite',
      }}
      {...rest}
    />
  );
}

