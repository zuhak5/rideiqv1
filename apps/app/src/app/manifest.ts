export const dynamic = 'force-static';

export default function manifest() {
  return {
    name: 'RideIQ',
    short_name: 'RideIQ',
    description: 'Unified rider, driver, and merchant experience for RideIQ.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F6F8FC',
    theme_color: '#0B5FFF',
    lang: 'en',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

