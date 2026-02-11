'use client';

import type { ReactNode } from 'react';
import { RoleLayout } from '@/components/RoleLayout';

const tabs = [
  { label: 'Home', href: '/driver/home' },
  { label: 'Requests', href: '/driver/requests' },
  { label: 'Earnings', href: '/driver/earnings' },
  { label: 'Support', href: '/driver/support' },
];

export default function DriverLayout({ children }: { children: ReactNode }) {
  return <RoleLayout title="Driver" tabs={tabs}>{children}</RoleLayout>;
}

