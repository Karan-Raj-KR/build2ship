'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  Flag,
  Heart,
  FolderKanban,
  UserRound,
  CalendarCheck,
  Sparkles,
  Library,
  Scale,
  Bot,
  Layers,
  Upload,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
  Search,
  Code2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CanonicalNavItem {
  readonly id: string;
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

export interface CanonicalNavGroup {
  readonly id: string;
  readonly title: string;
  readonly items: readonly CanonicalNavItem[];
}

const main: readonly CanonicalNavItem[] = [
  { id: 'discover', href: '/discover', label: 'Discover', icon: Compass },
  { id: 'contributions', href: '/contributions', label: 'Build your open source experience', icon: Code2 },
  { id: 'for-you', href: '/for-you', label: 'For You', icon: Sparkles },
  { id: 'scout', href: '/scout', label: 'Scout', icon: Search },
  { id: 'ask', href: '/ask', label: 'Ask build2ship', icon: Bot },
  { id: 'journey', href: '/journey', label: 'My journey', icon: Flag },
  { id: 'saved', href: '/saved', label: 'Saved', icon: Heart },
  { id: 'applications', href: '/workspace', label: 'Applications', icon: FolderKanban },
  { id: 'profile', href: '/profile', label: 'My profile', icon: UserRound },
];

const tools: readonly CanonicalNavItem[] = [
  { id: 'today', href: '/home', label: 'Today', icon: CalendarCheck },
  { id: 'library', href: '/library', label: 'Library', icon: Library },
  { id: 'compare', href: '/compare', label: 'Compare', icon: Scale },
  { id: 'ai-bridge', href: '/ai-bridge', label: 'AI Bridge', icon: Layers },
  { id: 'import', href: '/ingest', label: 'Import', icon: Upload },
];

export const CANONICAL_NAV_GROUPS: readonly CanonicalNavGroup[] = Object.freeze([
  { id: 'main', title: 'Your workspace', items: main },
  { id: 'tools', title: 'More tools', items: tools },
]);

export const CANONICAL_NAV_ITEMS = Object.freeze(CANONICAL_NAV_GROUPS.flatMap((group) => group.items));

// Primary Duolingo navigation hierarchy
const MOBILE_NAV_IDS = ['today', 'discover', 'applications', 'profile'];

export function AppNav({ displayName, onSignOut }: { displayName?: string | null; onSignOut?: () => void }) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const mobileDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (more) mobileDialog.current?.showModal();
    else mobileDialog.current?.close();
  }, [more]);

  const allNavMap = new Map(CANONICAL_NAV_ITEMS.map((item) => [item.id, item]));

  const primaryItems = [
    allNavMap.get('discover')!,
    allNavMap.get('contributions')!,
    allNavMap.get('today')!,
    allNavMap.get('applications')!,
    allNavMap.get('profile')!,
  ].filter(Boolean);

  const secondaryExploreItems = [
    allNavMap.get('for-you')!,
    allNavMap.get('scout')!,
    allNavMap.get('ask')!,
    allNavMap.get('saved')!,
  ].filter(Boolean);

  const moreToolItems = [
    allNavMap.get('library')!,
    allNavMap.get('compare')!,
    allNavMap.get('journey')!,
    allNavMap.get('ai-bridge')!,
    allNavMap.get('import')!,
  ].filter(Boolean);

  function isItemActive(href: string) {
    if (href === '/home' && (pathname === '/home' || pathname === '/today')) return true;
    if (href !== '/home' && (pathname === href || pathname.startsWith(`${href}/`))) return true;
    return false;
  }

  function renderNavLink(item: CanonicalNavItem, isMobile = false) {
    const active = isItemActive(item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.id}
        href={item.href}
        className={`adventure-navitem ${isMobile ? 'mobile' : ''} ${active ? 'active' : ''}`}
        aria-current={active ? 'page' : undefined}
        onClick={() => setMore(false)}
      >
        <Icon size={isMobile ? 22 : 20} strokeWidth={active ? 2.5 : 2} />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <>
      {/* Desktop Tactile Sidebar */}
      <aside className="adventure-sidebar" aria-label="Sidebar navigation">
        <Link href="/home" className="adventure-brand" aria-label="build2ship home">
          <span>b</span>
          build2ship<b>.</b>
        </Link>

        <nav aria-label="Main navigation">
          <span className="adventure-navlabel">Primary</span>
          {primaryItems.map((item) => renderNavLink(item))}

          <span className="adventure-navlabel workspace">Explore</span>
          {secondaryExploreItems.map((item) => renderNavLink(item))}

          <details className="adventure-moretools">
            <summary>More tools</summary>
            {moreToolItems.map((item) => renderNavLink(item))}
          </details>
        </nav>

        <div className="adventure-sidebarbottom">
          <Link href="/billing" className="adventure-navitem">
            <CreditCard size={18} />
            <span>Access & billing</span>
          </Link>
          <div className="adventure-account">
            <Link href="/profile" className="flex items-center gap-2 flex-1 min-w-0">
              <span className="adventure-avatar" aria-hidden="true">
                {displayName?.[0]?.toUpperCase() || <UserRound size={16} />}
              </span>
              <strong>{displayName || 'My profile'}</strong>
            </Link>
            <Link href="/settings" aria-label="Settings" className="adventure-icon-btn">
              <Settings size={18} />
            </Link>
            {onSignOut && (
              <button aria-label="Sign out" onClick={onSignOut} className="adventure-icon-btn">
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Sticky Bottom Navigation */}
      <nav className="adventure-mobile-nav" aria-label="Mobile navigation">
        {MOBILE_NAV_IDS.map((id) => renderNavLink(allNavMap.get(id)!, true))}
        <button
          aria-label="More tools and account"
          aria-expanded={more}
          aria-controls="mobile-tools"
          className="adventure-navitem mobile"
          onClick={() => setMore(!more)}
        >
          <Menu size={22} />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile Tools Drawer Dialog */}
      <dialog
        id="mobile-tools"
        ref={mobileDialog}
        className="adventure-mobile-more"
        aria-labelledby="mobile-tools-title"
        onClose={() => setMore(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientY < bounds.top) setMore(false);
          }
        }}
      >
        <div className="adventure-dialoghead">
          <h2 id="mobile-tools-title">More features</h2>
          <button className="adventure-close" aria-label="Close more tools" onClick={() => setMore(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="space-y-1">
          {renderNavLink(allNavMap.get('contributions')!)}
          {secondaryExploreItems.map((item) => renderNavLink(item))}
          {moreToolItems.map((item) => renderNavLink(item))}
          <Link href="/billing" className="adventure-navitem" onClick={() => setMore(false)}>
            <CreditCard size={20} />
            <span>Billing</span>
          </Link>
          <Link href="/settings" className="adventure-navitem" onClick={() => setMore(false)}>
            <Settings size={20} />
            <span>Settings</span>
          </Link>
        </nav>

        {onSignOut && (
          <button className="btn btn-secondary w-full mt-4" onClick={onSignOut}>
            Sign out
          </button>
        )}
      </dialog>
    </>
  );
}
