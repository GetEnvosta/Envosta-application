'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { cn } from '@/lib/utils';
import {
  Globe, Globe2, CreditCard, Mail, MessageCircle, Users,
  LogOut, Menu, X, Settings, Shield, LayoutDashboard,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface DashboardUser {
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
}

const nav = [
  { name: 'Overview',       href: '/dashboard',                icon: LayoutDashboard },
  { name: 'Sites',          href: '/dashboard/sites',          icon: Globe },
  { name: 'Domains',        href: '/dashboard/domains',        icon: Globe2 },
  { name: 'Email',          href: '/dashboard/email',          icon: Mail },
  { name: 'Billing',        href: '/dashboard/billing',        icon: CreditCard },
  { name: 'Tickets',        href: '/dashboard/tickets',        icon: MessageCircle },
];

function UserAvatar({ user, size = 32 }: { user: DashboardUser; size?: number }) {
  const initials = (user.full_name?.[0] || user.email[0] || '?').toUpperCase();

  if (user.avatar_url) {
    return (
      <Image
        src={user.avatar_url}
        alt={user.full_name || 'User avatar'}
        width={size}
        height={size}
        className="rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className="rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-semibold"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

function AvatarDropdown({ user }: { user: DashboardUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 rounded-full p-1 hover:bg-gray-100 transition-colors"
      >
        <UserAvatar user={user} size={32} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>

          <div className="py-1">
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </div>

          {user.role === 'admin' && (
            <>
              <div className="border-t border-gray-200" />
              <div className="py-1">
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Admin Dashboard
                </Link>
              </div>
            </>
          )}

          <div className="border-t border-gray-200" />
          <div className="py-1">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardShell({
  user,
  children,
}: {
  user: DashboardUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const SidebarNav = () => (
    <div className="flex flex-col flex-1">
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-200 relative',
              isActive(item.href)
                ? 'bg-gray-900 text-white font-medium shadow-sm'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            {item.name}
          </Link>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-gray-100">
        <Link
          href="/dashboard/partners"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-200',
            isActive('/dashboard/partners')
              ? 'bg-gray-900 text-white font-medium shadow-sm'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
          )}
        >
          <Users className="w-[18px] h-[18px] shrink-0" />
          Become a Partner
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 w-[260px] bg-white border-r border-gray-100 hidden lg:flex flex-col z-30">
        <div className="px-5 py-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <img src="/assets/Logo/envosta-logo-mark-dark.svg" alt="Envosta" className="w-7 h-7" />
            <span className="text-lg font-bold text-gray-900 tracking-tight">Envosta</span>
          </Link>
        </div>
        <SidebarNav />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-[260px] bg-white z-50 shadow-2xl flex flex-col">
            <div className="px-5 py-6 flex items-center justify-between">
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5"
              >
                <img src="/assets/Logo/envosta-logo-mark-dark.svg" alt="Envosta" className="w-7 h-7" />
                <span className="text-lg font-bold text-gray-900 tracking-tight">Envosta</span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarNav />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="lg:pl-[260px]">
        {/* Header bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 h-16 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 -ml-1.5 rounded-md text-gray-600 hover:bg-gray-100 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <img src="/assets/Logo/envosta-logo-mark-dark.svg" alt="Envosta" className="w-6 h-6" />
              <span className="font-bold text-gray-900">Envosta</span>
            </div>
          </div>

          <AvatarDropdown user={user} />
        </header>

        <main className="p-5 lg:p-8 max-w-[1200px]">
          {children}
        </main>
      </div>
    </div>
  );
}
