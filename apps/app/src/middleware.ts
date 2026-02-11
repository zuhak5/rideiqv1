import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';
import { appContextSchema } from '@/lib/contracts/schemas';
import { decideRedirect } from '@/lib/middleware/routeGuard';

function isStaticPath(pathname: string) {
  return pathname.startsWith('/_next') || pathname.startsWith('/icons') || pathname === '/favicon.ico' || pathname === '/manifest.webmanifest' || pathname === '/sw.js';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticPath(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const supabase = createSupabaseMiddlewareClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let context = null;

  if (user) {
    const { data } = await supabase.rpc('get_my_app_context');
    const row = Array.isArray(data) ? data[0] : data;
    const parsed = appContextSchema.safeParse(row);
    if (parsed.success) {
      context = parsed.data;
    }
  }

  const decision = decideRedirect({
    pathname,
    isAuthenticated: Boolean(user),
    context,
  });

  if (decision.redirectTo) {
    return NextResponse.redirect(new URL(decision.redirectTo, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image).*)',
  ],
};

