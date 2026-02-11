import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { appContextSchema } from '@/lib/contracts/schemas';

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = typeof params.code === 'string' ? params.code : null;

  if (!code) {
    redirect('/sign-in');
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirect('/sign-in');
  }

  const { data } = await supabase.rpc('get_my_app_context');
  const row = Array.isArray(data) ? data[0] : data;
  const parsed = appContextSchema.safeParse(row);

  if (!parsed.success) {
    redirect('/role');
  }

  if (!parsed.data.role_onboarding_completed) {
    redirect('/role');
  }

  redirect(`/${parsed.data.active_role}/home`);
}

