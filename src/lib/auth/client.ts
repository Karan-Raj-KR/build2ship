'use client';
import { createBrowserClient } from '@supabase/ssr';

const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const authClient = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
