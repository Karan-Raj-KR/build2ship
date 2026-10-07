'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppNav } from '@/components/layout/AppNav';
import { JourneyProvider, ProgressHeader } from '@/components/adventure/JourneyProvider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string | null>(null), [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await fetch('/api/profile', { cache: 'no-store' });
        if (response.status === 401) { router.replace('/login'); return; }
        const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Your profile could not be loaded.');
        if (result.profile.is_suspended) throw new Error('This account is suspended.');
        if (!result.profile.onboarding_completed) { router.replace('/onboarding'); return; }
        if (mounted) { setDisplayName(result.profile.display_name || 'Your profile'); }
      } catch (err) { if (mounted) setError(err instanceof Error ? err.message : 'Unable to connect to your account.'); }
    }
    void load(); return () => { mounted = false; };
  }, [router]);
  async function signOut() {
    const { createClient } = await import('@/lib/db/client');
    const { error } = await createClient().auth.signOut();
    if (error) { setError(error.message || 'Could not sign out.'); return; }
    sessionStorage.removeItem('eligent_session_verified'); sessionStorage.removeItem('eligent_display_name');
    router.push('/login');
  }
  return <JourneyProvider><div className="app-shell adventure-shell"><a href="#app-main" className="adventure-skip">Skip to content</a><AppNav displayName={displayName} onSignOut={signOut}/><div className="adventure-shellbody"><ProgressHeader/><main id="app-main" className="app-content" tabIndex={-1}>{error && <p className="alert alert-error" role="alert">{error}</p>}{children}</main></div></div></JourneyProvider>;
}
