import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProviders } from '@/components/providers/AppProviders';
import { OfflineBanner } from '@/design-system/components/primitives/OfflineBanner';

export const metadata: Metadata = {
  title: 'RideIQ Unified App',
  description: 'RideIQ rider, driver, and merchant app built with Next.js and Supabase.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'RideIQ',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B5FFF',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>
          <OfflineBanner />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}

