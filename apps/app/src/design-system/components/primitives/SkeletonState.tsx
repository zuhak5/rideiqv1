'use client';

import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';

export function SkeletonState({ rows = 4 }: { rows?: number }) {
  return (
    <Stack spacing={1.5}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} variant="rounded" height={48} />
      ))}
    </Stack>
  );
}

