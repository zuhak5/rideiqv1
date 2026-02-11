import type { NextConfig } from 'next';

function originFromUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

const supabaseOrigin = originFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? '';
const appOrigin = originFromUrl(process.env.NEXT_PUBLIC_APP_ORIGIN) ?? '';

const connectSrc = [
  "'self'",
  supabaseOrigin,
  supabaseOrigin ? supabaseOrigin.replace(/^https:/, 'wss:') : '',
  'https://realtime.ably.io',
  'https://rest.ably.io',
  'https://maps.googleapis.com',
  'https://api.mapbox.com',
  'https://*.hereapi.com',
  'https://tile.thunderforest.com',
].filter(Boolean);

const imgSrc = [
  "'self'",
  'data:',
  'blob:',
  'https://*.supabase.co',
  'https://*.googleapis.com',
  'https://api.mapbox.com',
  'https://*.hereapi.com',
  'https://tile.thunderforest.com',
].filter(Boolean);

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  'https://maps.googleapis.com',
  'https://api.mapbox.com',
  'https://js.api.here.com',
].filter(Boolean);

const styleSrc = ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'].filter(Boolean);
const fontSrc = ["'self'", 'data:', 'https://fonts.gstatic.com'].filter(Boolean);

const contentSecurityPolicy = [
  "default-src 'self'",
  `connect-src ${connectSrc.join(' ')}`,
  `img-src ${imgSrc.join(' ')}`,
  `script-src ${scriptSrc.join(' ')}`,
  `style-src ${styleSrc.join(' ')}`,
  `font-src ${fontSrc.join(' ')}`,
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `manifest-src 'self' ${appOrigin}`.trim(),
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
        ],
      },
    ];
  },
};

export default nextConfig;

