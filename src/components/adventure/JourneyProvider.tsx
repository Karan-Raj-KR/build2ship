'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, X } from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import type { JourneyData } from '@/lib/journey';

const JourneyContext = createContext<{
  data: JourneyData | null;
  error: string;
  refresh: (celebrate?: boolean) => Promise<void>;
}>({ data: null, error: '', refresh: async () => {} });

export const useJourney = () => useContext(JourneyContext);

export function Pip({ className = '', alt = 'Elara Guide' }: { className?: string; alt?: string }) {
  // Graceful fallback for mascot calls — keeps DOM clean without broken layouts
  return (
    <div
      className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--primary-subtle)] border-2 border-[var(--primary)] text-[var(--primary)] font-black text-xl shadow-[0_2px_0_#58CC02] ${className}`}
      aria-label={alt}
    >
      <span>✦</span>
    </div>
  );
}

export function JourneyProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<JourneyData | null>(null);
  const [error, setError] = useState('');
  const [celebration, setCelebration] = useState(false);
  const previousCompleted = useRef<number | null>(null);

  const refresh = useCallback(async (celebrate = false) => {
    try {
      const response = await fetch('/api/journey', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Progress is unavailable.');

      const completedCount = result.rewards?.length ?? 0;
      if (celebrate && previousCompleted.current !== null && completedCount > previousCompleted.current) {
        setCelebration(true);
      }
      previousCompleted.current = completedCount;
      setData(result);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Progress is unavailable.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const updated = () => {
      void refresh(true);
    };
    window.addEventListener('elara:progress', updated);
    return () => window.removeEventListener('elara:progress', updated);
  }, [refresh]);

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(false), 4000);
    return () => clearTimeout(timer);
  }, [celebration]);

  return (
    <JourneyContext.Provider value={{ data, error, refresh }}>
      {children}
      {celebration && (
        <div className="adventure-celebration" role="status">
          <CheckCircle2 size={22} className="text-[#58CC02]" aria-hidden="true" />
          <p>Nicely done!</p>
          <strong>Step completed</strong>
          <button
            aria-label="Dismiss progress notification"
            className="text-gray-400 hover:text-gray-600"
            onClick={() => setCelebration(false)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </JourneyContext.Provider>
  );
}

export function ProgressHeader() {
  const { data } = useJourney();
  const pathname = usePathname();

  const sectionName = pathname.startsWith('/home') || pathname === '/today'
    ? 'Today'
    : pathname.startsWith('/contributions')
    ? 'Build your experience'
    : pathname.startsWith('/for-you')
    ? 'For You'
    : pathname.startsWith('/scout')
    ? 'Scout'
    : pathname.startsWith('/ask')
    ? 'Ask Elara'
    : pathname.startsWith('/workspace')
    ? 'Applications'
    : pathname.startsWith('/saved')
    ? 'Saved'
    : pathname.startsWith('/journey')
    ? 'My Journey'
    : pathname.startsWith('/profile')
    ? 'Profile'
    : pathname.startsWith('/discover')
    ? 'Discover'
    : pathname.startsWith('/compare')
    ? 'Compare'
    : pathname.startsWith('/library')
    ? 'Library'
    : 'Workspace';

  const profilePct = data?.profile_completion ?? 0;

  return (
    <header className="adventure-topbar">
      <span>
        <strong>{sectionName}</strong>
        <em aria-hidden="true">/</em>
        <small className="text-gray-500 font-medium hidden sm:inline">Focused Opportunity Workspace</small>
      </span>

      <div className="adventure-stats">
        {data && (
          <Link
            href="/profile"
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-[var(--line)] bg-white text-xs font-bold text-[var(--ink)] hover:border-[var(--primary)] transition-colors"
            title="Profile completion"
          >
            <div className="w-16 h-2 bg-[var(--line)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--primary)] rounded-full"
                style={{ width: `${profilePct}%` }}
              />
            </div>
            <span>{profilePct}% Profile</span>
          </Link>
        )}
        <NotificationCenter railPosition="header" />
      </div>
    </header>
  );
}
