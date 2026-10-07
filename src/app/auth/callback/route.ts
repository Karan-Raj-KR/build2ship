import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/db/server';

function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.includes('://') && !value.includes('\\') ? value : '/discover';
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext(url.searchParams.get('next')), url.origin));
  }
  const login = new URL('/login', url.origin);
  login.searchParams.set('error', 'auth_callback');
  return NextResponse.redirect(login);
}
