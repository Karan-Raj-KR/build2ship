import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const isProd = process.env.NODE_ENV === 'production';
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    cookieOptions: { secure: isProd, sameSite: 'lax' },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, { ...options, secure: isProd, sameSite: 'lax' }));
      },
    },
  });

  const path = request.nextUrl.pathname;
  const publicPages = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/demo', '/callback', '/privacy', '/terms', '/refund', '/support'];
  const publicPrefixes = ['/api/auth/', '/api/session', '/auth/callback', '/api/payments/webhook', '/api/cron/', '/api/notifications/unsubscribe', '/api/scout/query', '/api/runner/', '/full-auto/'];
  if (publicPages.includes(path) || publicPrefixes.some(prefix => path.startsWith(prefix))) return response;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email_confirmed_at) {
    if (path.startsWith('/api/')) return NextResponse.json({ error: 'Authentication required. Please sign in.' }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie.name, cookie.value));
    redirect.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
    return redirect;
  }
  response.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
  return response;
}
