'use client';

import type { ReactNode } from 'react';
import { RoleLayout } from '@/components/RoleLayout';

const tabs = [
  { label: 'Home', href: '/merchant/home' },
  { label: 'Chat', href: '/merchant/chat' },
  { label: 'Payouts', href: '/merchant/payouts' },
  { label: 'Support', href: '/merchant/support' },
];

export default function MerchantLayout({ children }: { children: ReactNode }) {
  return <RoleLayout title="Merchant" tabs={tabs}>{children}</RoleLayout>;
}

