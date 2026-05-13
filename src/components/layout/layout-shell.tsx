'use client';

/**
 * <LayoutShell> — single skeleton powering AdminShell and DashboardShell.
 * Owns the structural concerns that should always behave the same regardless
 * of audience:
 *
 *   - Fixed desktop sidebar at lg breakpoint
 *   - Mobile overlay sidebar (open/close, click-outside dismiss, route-change dismiss)
 *   - Mobile header with hamburger
 *   - Sticky-top header with optional right-side content
 *   - Optional top-of-page banner (e.g. impersonation banner on dashboard/admin)
 *   - Active-link logic (exact match for the index route, prefix match elsewhere)
 *
 * The three things that legitimately differ per audience are passed as props:
 *
 *   - `variant: 'dark' | 'light'`   — sidebar + mobile header theme
 *   - `accent`                       — active-link styling (admin: white/10, dashboard: gray-900)
 *   - slot props (`headerRight`, `sidebarFooter`, `sidebarExtras`, `topBanner`)
 *
 * Avatar dropdown is exported separately (`<ShellAvatarDropdown>`) so each
 * shell can supply audience-specific menu items (e.g. dashboard adds "Staff
 * Panel" for staff users; admin doesn't use a dropdown at all and puts
 * user info in the sidebar footer).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { LogOut, Menu, X } from 'lucide-react';

export type NavItem = {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

export type ShellVariant = 'dark' | 'light';

export type ShellAccent = {
  active: string;
  inactive: string;
};

export type Brand = {
  /** Where the brand link routes to (sidebar header). */
  href: string;
  /** Path to logo SVG. */
  mark: string;
  /** Brand name shown next to the mark. */
  label: string;
  /** Optional small uppercase tag, e.g. "Staff". */
  tag?: string;
  /** Tag color class (defaults to indigo-400/70 for dark variant, gray-500 for light). */
  tagClass?: string;
};

export interface LayoutShellProps {
  variant: ShellVariant;
  brand: Brand;
  nav: NavItem[];
  accent: ShellAccent;
  /** What to render at the top of the page above the header (e.g. impersonation banner). */
  topBanner?: React.ReactNode;
  /** What goes on the right of the desktop/mobile header (avatar dropdown, etc). */
  headerRight?: React.ReactNode;
  /** Extra nav block placed under the main nav. */
  sidebarExtras?: React.ReactNode;
  /** Block at the very bottom of the sidebar (e.g. admin's user info + sign-out). */
  sidebarFooter?: React.ReactNode;
  /** Whether to show the sticky header. Admin doesn't (uses sidebar-footer for user). */
  showHeader?: boolean;
  /** Max content width. */
  maxWidth?: '1200px' | '1400px';
  children: React.ReactNode;
}

const DARK_BG = 'bg-gradient-to-b from-[#0f1629] to-[#0a0f1e]';
const LIGHT_BG = 'bg-white border-r border-gray-100';

export function LayoutShell({
  variant,
  brand,
  nav,
  accent,
  topBanner,
  headerRight,
  sidebarExtras,
  sidebarFooter,
  showHeader = true,
  maxWidth = '1200px',
  children,
}: LayoutShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile sidebar whenever the route actually changes.
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isActive = (href: string) =>
    href === brand.href ? pathname === brand.href : pathname.startsWith(href);

  const sidebarBg = variant === 'dark' ? DARK_BG : LIGHT_BG;
  const tagColor = brand.tagClass ?? (variant === 'dark' ? 'text-indigo-400/70' : 'text-gray-400');

  const Sidebar = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <div className={cn('flex flex-col h-full', sidebarBg)}>
      <div className="px-5 py-6">
        <Link href={brand.href} onClick={onLinkClick} className="flex items-center gap-2.5">
          <img src={brand.mark} alt={brand.label} className="w-7 h-7" />
          <span className={cn('text-lg font-bold tracking-tight', variant === 'dark' ? 'text-white' : 'text-gray-900')}>
            {brand.label}
          </span>
          {brand.tag && (
            <span className={cn('text-[10px] font-medium uppercase tracking-widest ml-1', tagColor)}>
              {brand.tag}
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {nav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
              isActive(item.href) ? accent.active : accent.inactive,
            )}
          >
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            {item.name}
          </Link>
        ))}
        {sidebarExtras}
      </nav>

      {sidebarFooter && (
        <div className={cn('p-3', variant === 'dark' ? 'border-t border-admin-800' : 'border-t border-gray-100')}>
          {sidebarFooter}
        </div>
      )}
    </div>
  );

  const sidebarWidth = variant === 'dark' ? 'w-60' : 'w-[260px]';
  const mainPad = variant === 'dark' ? 'lg:pl-60' : 'lg:pl-[260px]';
  const pageBg = variant === 'dark' ? 'bg-gray-50' : 'bg-[#f8f9fb]';

  return (
    <div className={cn('min-h-screen', pageBg)}>
      {topBanner}

      {/* Desktop sidebar */}
      <aside className={cn('fixed inset-y-0 left-0 hidden lg:flex flex-col z-30', sidebarWidth)}>
        <Sidebar />
      </aside>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className={cn('fixed inset-0', variant === 'dark' ? 'bg-black/30' : 'bg-black/40 backdrop-blur-sm')} onClick={() => setMobileOpen(false)} />
          <aside className={cn('fixed inset-y-0 left-0 z-50 shadow-xl flex flex-col', sidebarWidth, variant === 'dark' ? '' : 'bg-white')}>
            {variant === 'light' && (
              <div className="px-5 py-6 flex items-center justify-between">
                <Link href={brand.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
                  <img src={brand.mark} alt={brand.label} className="w-7 h-7" />
                  <span className="text-lg font-bold text-gray-900 tracking-tight">{brand.label}</span>
                  {brand.tag && (
                    <span className={cn('text-[10px] font-medium uppercase tracking-widest', tagColor)}>{brand.tag}</span>
                  )}
                </Link>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            {variant === 'dark'
              ? <Sidebar onLinkClick={() => setMobileOpen(false)} />
              : <SidebarNavOnly nav={nav} accent={accent} isActive={isActive} sidebarExtras={sidebarExtras} sidebarFooter={sidebarFooter} variant={variant} onLinkClick={() => setMobileOpen(false)} />
            }
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className={mainPad}>
        {showHeader ? (
          <header className={cn(
            'sticky top-0 z-20 h-16 flex items-center justify-between px-4 lg:px-8',
            variant === 'dark'
              ? 'bg-[#0f1629] lg:hidden h-14'
              : 'bg-white/80 backdrop-blur-xl border-b border-gray-100',
          )}>
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileOpen(true)} className={cn(
                'p-1.5 -ml-1.5 rounded-md lg:hidden',
                variant === 'dark' ? 'text-gray-400 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100',
              )}>
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 lg:hidden">
                <img src={brand.mark} alt={brand.label} className="w-6 h-6" />
                <span className={cn('font-bold', variant === 'dark' ? 'text-white' : 'text-gray-900')}>{brand.label}</span>
                {brand.tag && (
                  <span className={cn('text-[10px] font-medium uppercase tracking-widest', tagColor)}>{brand.tag}</span>
                )}
              </div>
            </div>
            {headerRight}
          </header>
        ) : (
          // Admin variant: mobile-only header for the hamburger; no avatar in header.
          <header className="lg:hidden sticky top-0 z-20 bg-[#0f1629] px-4 h-14 flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="p-1.5 -ml-1.5 rounded-lg text-gray-400 hover:bg-white/10">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <img src={brand.mark} alt={brand.label} className="w-6 h-6" />
              <span className="font-bold text-white">{brand.label}</span>
              {brand.tag && (
                <span className={cn('text-[10px] font-medium uppercase tracking-widest', tagColor)}>{brand.tag}</span>
              )}
            </div>
          </header>
        )}

        <main className={cn('p-5 lg:p-8', maxWidth === '1400px' ? 'max-w-[1400px]' : 'max-w-[1200px]')}>
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Light-mode mobile sidebar body. Reused only in the mobile overlay because
 * the light variant has a separate brand row inline with the close button,
 * and re-rendering the dark <Sidebar> would conflict.
 */
function SidebarNavOnly({
  nav, accent, isActive, sidebarExtras, sidebarFooter, variant, onLinkClick,
}: {
  nav: NavItem[];
  accent: ShellAccent;
  isActive: (href: string) => boolean;
  sidebarExtras?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  variant: ShellVariant;
  onLinkClick: () => void;
}) {
  return (
    <div className="flex flex-col flex-1">
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {nav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
              isActive(item.href) ? accent.active : accent.inactive,
            )}
          >
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            {item.name}
          </Link>
        ))}
        {sidebarExtras}
      </nav>
      {sidebarFooter && (
        <div className={cn('p-3', variant === 'dark' ? 'border-t border-admin-800' : 'border-t border-gray-100')}>
          {sidebarFooter}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared header avatar dropdown — used by the Dashboard shell. Admin
// puts user info in the sidebar footer instead.
// ─────────────────────────────────────────────────────────────────────────────

export function ShellAvatarDropdown({
  user,
  items,
}: {
  user: { full_name: string | null; email: string };
  items?: Array<{ label: string; href?: string; icon: ComponentType<{ className?: string }>; onClick?: () => void; divider?: boolean }>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSignOut() {
    await fetch('/auth/signout', { method: 'POST' });
    window.location.href = '/auth/login';
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 rounded-full p-1 hover:bg-gray-100 transition-colors">
        <Avatar name={user.full_name || user.email} size="sm" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900 truncate">{user.full_name || 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          {(items ?? []).map((item, i) => (
            item.divider ? (
              <div key={`d${i}`} className="border-t border-gray-200" />
            ) : item.href ? (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ) : (
              <button key={item.label} onClick={() => { item.onClick?.(); setOpen(false); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            )
          ))}
          <div className="border-t border-gray-200" />
          <button onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
