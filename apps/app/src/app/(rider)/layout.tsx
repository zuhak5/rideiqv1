'use client';

import type { ReactNode } from 'react';
import { RoleLayout } from '@/components/RoleLayout';

const tabs = [
  { label: 'Home', href: '/rider/home' },
  { label: 'Trips', href: '/rider/trips' },
  { label: 'Support', href: '/rider/support' },
  { label: 'Safety', href: '/rider/safety' },
];

export default function RiderLayout({ children }: { children: ReactNode }) {
  return <RoleLayout title="Rider" tabs={tabs}>{children}</RoleLayout>;
}

