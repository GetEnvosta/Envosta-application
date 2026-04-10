'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import {
  LayoutDashboard, Users, MessageCircle, DollarSign, UserCircle,
  LogOut, Menu, X, ArrowLeft,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface PartnerUser {
  full_name: string | null;
  email: string;
}

const nav = [
  { name: 'Dashboard', href: '/partner', icon: LayoutDashboard },
  { name: 'Clients', href: '/partner/clients', icon: Users },
  { name: 'Tickets', href: '/partner/tickets', icon: MessageCircle },
  { name: 'Earnings', href: '/partner/earnings', icon: DollarSign },
  { name: 'Profile', href: '/partner/profile', icon: UserCircle },
];

function AvatarDropdown({ user }: { user: PartnerUser }) {
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
    const { createClient } = await import('@/lib/supabase-browser');
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
        <Avatar name={user.full_name || user.email} size="sm" />
        <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.full_name || user.email}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg ring-1 ring-gray-200/50 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          <div className="py-1">
            <Link href="/dashboard" onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Customer View
            </Link>
          </div>
          <div className="border-t border-gray-200" />
          <div className="py-1">
            <button onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PartnerShell({ user, children }: { user: PartnerUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/partner' ? pathname === '/partner' : pathname.startsWith(href);

  const SidebarNav = () => (
    <div className="flex flex-col flex-1">
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(item => (
          <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-200',
              isActive(item.href)
                ? 'bg-sky-600 text-white font-medium shadow-sm'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            )}>
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <aside className="fixed inset-y-0 left-0 w-[260px] bg-white border-r border-gray-100 hidden lg:flex flex-col z-30">
        <div className="px-5 py-6">
          <Link href="/partner" className="flex items-center gap-2.5">
            <img src="/assets/Logo/envosta-logo-mark-dark.svg" alt="Envosta" className="w-7 h-7" />
            <span className="text-lg font-bold text-gray-900 tracking-tight">Partner</span>
          </Link>
        </div>
        <SidebarNav />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-[260px] bg-white z-50 shadow-2xl flex flex-col">
            <div className="px-5 py-6 flex items-center justify-between">
              <Link href="/partner" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
                <img src="/assets/Logo/envosta-logo-mark-dark.svg" alt="Envosta" className="w-7 h-7" />
                <span className="text-lg font-bold text-gray-900 tracking-tight">Partner</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarNav />
          </aside>
        </div>
      )}

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 h-16 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="p-1.5 -ml-1.5 rounded-md text-gray-600 hover:bg-gray-100 lg:hidden">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <img src="/assets/Logo/envosta-logo-mark-dark.svg" alt="Envosta" className="w-6 h-6" />
              <span className="font-bold text-gray-900">Partner</span>
            </div>
          </div>
          <AvatarDropdown user={user} />
        </header>
        <main className="p-5 lg:p-8 max-w-[1200px]">{children}</main>
      </div>
    </div>
  );
}
