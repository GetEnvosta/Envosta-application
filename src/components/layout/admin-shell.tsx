'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Server, Globe, CreditCard, ScrollText,
  Activity, LogOut, Menu, X, ArrowLeft, Tag, PenSquare, MessageSquare, Mail, Percent, AlertTriangle, DollarSign, Paintbrush,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { canAccessAdminNav } from '@/lib/roles';

const allNav = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Services', href: '/admin/services', icon: Server },
  { name: 'Domains', href: '/admin/domains', icon: Globe },
  { name: 'Studio', href: '/admin/studio', icon: Paintbrush },
  { name: 'Tickets', href: '/admin/tickets', icon: MessageSquare },
  { name: 'Subscriptions', href: '/admin/subscriptions', icon: ScrollText },
  { name: 'Billing', href: '/admin/billing', icon: CreditCard },
  { name: 'Commissions', href: '/admin/commissions', icon: DollarSign },
  { name: 'Promotions', href: '/admin/promotions', icon: Percent },
  { name: 'Products', href: '/admin/products', icon: Tag },
  { name: 'Blog', href: '/admin/blog', icon: PenSquare },
  { name: 'Emails', href: '/admin/emails', icon: Mail },
  { name: 'Diagnostics', href: '/admin/diagnostics', icon: AlertTriangle },
  { name: 'System Health', href: '/admin/logs', icon: Activity },
];

export function AdminShell({
  user, email, role, children,
}: {
  user: any; email: string; role: string; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = useMemo(() => allNav.filter(item => canAccessAdminNav(role, item.href)), [role]);

  async function handleSignOut() {
    await fetch('/auth/signout', { method: 'POST' });
    window.location.href = '/auth/login';
  }

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0f1629] to-[#0a0f1e]">
      <div className="px-5 py-6">
        <Link href="/admin" className="flex items-center gap-2.5">
          <img src="/assets/Logo/envosta-logo-mark.svg" alt="Envosta" className="w-7 h-7" />
          <span className="text-lg font-bold text-white tracking-tight">Envosta</span>
          <span className="text-indigo-400/70 text-[10px] font-medium uppercase tracking-widest ml-1">Staff</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {nav.map(item => (
          <Link key={item.href} href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
              isActive(item.href)
                ? 'bg-white/10 text-white shadow-sm backdrop-blur-sm'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
            )}>
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-admin-800">
        <Link href="/dashboard"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-admin-400 hover:text-white hover:bg-admin-900 transition-colors mb-2">
          <ArrowLeft className="w-4 h-4" />
          Customer view
        </Link>

        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar name={user?.full_name || email} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.full_name || 'Admin'}</p>
            <p className="text-xs text-admin-400 truncate">{email}</p>
          </div>
          <button onClick={handleSignOut} className="p-1.5 rounded-md text-admin-500 hover:text-admin-300 hover:bg-admin-800"
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
      <aside className="fixed inset-y-0 left-0 w-60 hidden lg:flex flex-col z-30">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-60 z-50 shadow-xl">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="lg:pl-60">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-[#0f1629] px-4 h-14 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 -ml-1.5 rounded-lg text-gray-400 hover:bg-white/10">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/assets/Logo/envosta-logo-mark.svg" alt="Envosta" className="w-6 h-6" />
            <span className="font-bold text-white">Envosta</span>
            <span className="text-indigo-400/70 text-[10px] font-medium uppercase tracking-widest">Staff</span>
          </div>
        </header>

        <main className="p-5 lg:p-8 max-w-[1400px]">
          {children}
        </main>
      </div>
    </div>
  );
}
