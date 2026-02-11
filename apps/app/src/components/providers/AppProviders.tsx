'use client';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { appTheme } from '@/design-system/theme';
import { LocaleProvider } from './LocaleProvider';
import { ToastProvider } from '@/design-system/components/primitives/Toast';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import { AnalyticsRouteTracker } from './AnalyticsRouteTracker';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={appTheme}>
        <LocaleProvider>
          <ToastProvider>
            <CssBaseline />
            <ServiceWorkerRegistration />
            <AnalyticsRouteTracker />
            {children}
          </ToastProvider>
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

