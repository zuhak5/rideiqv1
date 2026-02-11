'use client';

import type { ReactNode } from 'react';
import { AppScaffold } from '@/design-system/components/primitives/AppScaffold';
import { TopBar } from '@/design-system/components/primitives/TopBar';
import { BottomTabs } from '@/design-system/components/primitives/BottomTabs';

export function RoleLayout({
  title,
  tabs,
  children,
}: {
  title: string;
  tabs: Array<{ label: string; href: string }>;
  children: ReactNode;
}) {
  return <AppScaffold topBar={<TopBar title={title} />} bottomBar={<BottomTabs items={tabs} />}>{children}</AppScaffold>;
}

