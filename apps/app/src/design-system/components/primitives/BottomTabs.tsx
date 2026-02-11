'use client';

import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import { usePathname, useRouter } from 'next/navigation';

type TabItem = {
  label: string;
  href: string;
};

export function BottomTabs({ items }: { items: TabItem[] }) {
  const pathname = usePathname();
  const router = useRouter();

  const current = items.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href ?? items[0]?.href ?? '';

  return (
    <Paper sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1200 }} elevation={8}>
      <BottomNavigation
        value={current}
        onChange={(_, value) => router.push(value)}
        showLabels
        aria-label="Bottom navigation"
      >
        {items.map((item) => (
          <BottomNavigationAction key={item.href} label={item.label} value={item.href} />
        ))}
      </BottomNavigation>
    </Paper>
  );
}

