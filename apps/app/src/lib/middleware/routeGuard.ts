import type { AppContext } from '@/lib/contracts/schemas';

export type GuardDecision = {
  redirectTo: string | null;
};

const PUBLIC_PREFIXES = ['/share/'];
const AUTH_PREFIXES = ['/sign-in', '/sign-up', '/auth/callback'];
const ONBOARDING_PREFIXES = ['/role', '/profile', '/done'];

function startsWithOne(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export function isPublicPath(pathname: string): boolean {
  return startsWithOne(pathname, PUBLIC_PREFIXES) || startsWithOne(pathname, AUTH_PREFIXES);
}

export function isOnboardingPath(pathname: string): boolean {
  return startsWithOne(pathname, ONBOARDING_PREFIXES);
}

export function getRoleFromPath(pathname: string): AppContext['active_role'] | null {
  if (pathname.startsWith('/rider')) return 'rider';
  if (pathname.startsWith('/driver')) return 'driver';
  if (pathname.startsWith('/merchant')) return 'merchant';
  return null;
}

export function homeForRole(role: AppContext['active_role']): string {
  return `/${role}/home`;
}

export function decideRedirect(params: {
  pathname: string;
  isAuthenticated: boolean;
  context: AppContext | null;
}): GuardDecision {
  const { pathname, isAuthenticated, context } = params;

  if (!isAuthenticated) {
    if (isPublicPath(pathname)) return { redirectTo: null };
    return { redirectTo: '/sign-in' };
  }

  if (AUTH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    if (context) return { redirectTo: homeForRole(context.active_role) };
    return { redirectTo: '/role' };
  }

  if (!context) {
    return { redirectTo: '/role' };
  }

  if (!context.role_onboarding_completed) {
    if (pathname === '/role') return { redirectTo: null };
    if (pathname === '/profile') return { redirectTo: null };
    if (pathname === '/done') return { redirectTo: null };
    return { redirectTo: '/role' };
  }

  if (pathname === '/role' || pathname === '/profile' || pathname === '/done') {
    return { redirectTo: homeForRole(context.active_role) };
  }

  const pathRole = getRoleFromPath(pathname);
  if (pathRole && pathRole !== context.active_role) {
    return { redirectTo: homeForRole(context.active_role) };
  }

  return { redirectTo: null };
}

