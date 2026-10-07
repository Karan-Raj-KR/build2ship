import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const isProd = process.env.NODE_ENV === 'production';

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    cookieOptions: { secure: isProd, sameSite: 'lax' },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, { ...options, secure: isProd, sameSite: 'lax' }));
        } catch {}
      },
    },
  });
}
