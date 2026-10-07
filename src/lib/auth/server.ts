import 'server-only';
import { createClient } from '@/lib/db/server';
import type { Profile } from '@/types/database';

export async function getAccountUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!user) return null;
  if (!user.email_confirmed_at) throw new Error('Verify your email before opening your workspace.');

  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile) return null;
  return {
    app_metadata: { ...user.app_metadata, role: profile.role, is_admin: profile.is_admin },
    id: user.id,
    email: user.email,
    user_metadata: { ...user.user_metadata, display_name: profile.display_name },
    profile: profile as Profile,
  };
}
