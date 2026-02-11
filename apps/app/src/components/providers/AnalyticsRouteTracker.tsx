'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/analytics/events';

export function AnalyticsRouteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    void trackEvent('auth_started', { pathname });
  }, [pathname]);

  return null;
}

