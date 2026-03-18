'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Globe, Server, CreditCard, Settings, LogOut,
  Activity, ChevronDown, Menu, X, Shield
} from 'lucide-react';
import { useState } from 'react';

const nav = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Sites', href: '/dashboard/sites', icon: Server },
  { name: 'Domains', href: '/dashboard/domains', icon: Globe },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Activity', href: '/dashboard/logs', icon: Activity },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardShell({
  user, email, role, children,
}: {
  user: any; email: string; role?: string; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-gray-200/80">
        <Link href="/dashboard" className="text-lg font-bold text-gray-900 tracking-tight">
          Envosta
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map(item => (
          <Link key={item.href} href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive(item.href)
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}>
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            {item.name}
          </Link>
        ))}
        {role === 'admin' && (
          <>
            <div className="my-2 border-t border-gray-200/80" />
            <Link href="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-admin-600 hover:bg-admin-50 hover:text-admin-700 transition-colors">
              <Shield className="w-[18px] h-[18px] shrink-0" />
              Staff Panel
            </Link>
          </>
        )}
      </nav>

      <div className="p-3 border-t border-gray-200/80">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
            {(user?.full_name?.[0] || email[0] || '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name || 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{email}</p>
          </div>
          <button onClick={handleSignOut} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 w-60 bg-white border-r border-gray-200/80 hidden lg:flex flex-col z-30">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-60 bg-white z-50 shadow-xl">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="lg:pl-60">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200/80 px-4 h-14 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 -ml-1.5 rounded-md text-gray-600 hover:bg-gray-100">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-gray-900">Envosta</span>
        </header>

        <main className="p-6 lg:p-8 max-w-6xl">
          {children}
        </main>
      </div>
    </div>
  );
}
