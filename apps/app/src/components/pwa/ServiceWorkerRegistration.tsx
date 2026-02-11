'use client';

import { useEffect } from 'react';
import { useToast } from '@/design-system/components/primitives/Toast';

export function ServiceWorkerRegistration() {
  const { pushToast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register('/sw.js');

        registration.addEventListener('updatefound', () => {
          const worker = registration?.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              pushToast('Update available. Reload to use the latest version.', 'info');
            }
          });
        });
      } catch {
        // Ignore SW registration failures in unsupported environments.
      }
    };

    void register();

    return () => {
      if (registration) {
        // No-op; keep registration alive.
      }
    };
  }, [pushToast]);

  return null;
}

