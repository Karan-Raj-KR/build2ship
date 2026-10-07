'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppNav } from '@/components/layout/AppNav';
import { JourneyProvider, ProgressHeader } from '@/components/adventure/JourneyProvider';

const sidebarKey = 'build2ship:sidebar-collapsed';
let sidebarFallback = false;
function sidebarSnapshot() {
  try { return localStorage.getItem(sidebarKey) === 'true'; } catch { return sidebarFallback; }
}
function subscribeSidebar(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener('build2ship:sidebar', listener);
  return () => { window.removeEventListener('storage', listener); window.removeEventListener('build2ship:sidebar', listener); };
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState<string | null>(null), [error, setError] = useState('');
  const sidebarCollapsed = useSyncExternalStore(subscribeSidebar, sidebarSnapshot, () => false);
  function toggleSidebar() {
    const next = !sidebarCollapsed;
    sidebarFallback = next;
    try { localStorage.setItem(sidebarKey, String(next)); } catch { /* Keep the toggle usable without storage. */ }
    window.dispatchEvent(new Event('build2ship:sidebar'));
  }
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
  const isContributions = pathname.startsWith('/contributions');

  if (isContributions) {
    return (
      <JourneyProvider>
        <div className="contributions-fullscreen-root min-h-screen bg-black text-white selection:bg-sky-300 selection:text-zinc-950">
          <a href="#app-main" className="adventure-skip">Skip to content</a>
          <main id="app-main" tabIndex={-1} className="w-full min-h-screen">
            {error && <p className="alert alert-error m-4" role="alert">{error}</p>}
            {children}
          </main>
        </div>
      </JourneyProvider>
    );
  }

  return (
    <JourneyProvider>
      <div className={`app-shell adventure-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <a href="#app-main" className="adventure-skip">Skip to content</a>
        <AppNav displayName={displayName} onSignOut={signOut} collapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} />
        <div className="adventure-shellbody">
          <ProgressHeader />
          <main id="app-main" className="app-content" tabIndex={-1}>
            {error && <p className="alert alert-error" role="alert">{error}</p>}
            {children}
          </main>
        </div>
      </div>
    </JourneyProvider>
  );
}
