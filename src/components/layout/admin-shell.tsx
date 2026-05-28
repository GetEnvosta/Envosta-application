'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  LayoutDashboard, Users, Server, Globe, CreditCard,
  Activity, LogOut, ArrowLeft, PenSquare, MessageSquare, Settings,
  ScrollText,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { canAccessAdminNav } from '@/lib/roles';
import { LayoutShell, type NavItem } from './layout-shell';

const allNav: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/customers', icon: Users },
  { name: 'Sites', href: '/admin/services', icon: Server },
  { name: 'Domains', href: '/admin/domains', icon: Globe },
  { name: 'Tickets', href: '/admin/tickets', icon: MessageSquare },
  { name: 'Blog', href: '/admin/blog', icon: PenSquare },
  // Billing now includes Reporting as the Revenue + Funnel tabs
  // (/admin/reporting redirects to /admin/billing?view=revenue).
  { name: 'Billing', href: '/admin/billing', icon: CreditCard },
  // Cleanup queue folded into /admin/services as a filter chip
  // (?view=cleanup). The standalone page was removed.
  { name: 'Health', href: '/admin/diagnostics', icon: Activity },
  { name: 'Audit', href: '/admin/audit', icon: ScrollText },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminShell({
  user, email, role, children,
}: {
  user: any; email: string; role: string; children: React.ReactNode;
}) {
  const nav = useMemo(() => allNav.filter(item => canAccessAdminNav(role, item.href)), [role]);

  async function handleSignOut() {
    await fetch('/auth/signout', { method: 'POST' });
    window.location.href = '/auth/login';
  }

  return (
    <LayoutShell
      variant="dark"
      brand={{ href: '/admin', mark: '/assets/Logo/envosta-logo-mark.svg', label: 'Envosta', tag: 'Staff' }}
      nav={nav}
      accent={{
        active: 'bg-white/10 text-white shadow-sm backdrop-blur-sm',
        inactive: 'text-gray-400 hover:bg-white/5 hover:text-gray-200',
      }}
      maxWidth="1400px"
      showHeader={false}
      sidebarFooter={
        <>
          <Link href="/dashboard"
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
            <button onClick={handleSignOut} className="p-1.5 rounded-md text-admin-500 hover:text-admin-300 hover:bg-admin-800" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </>
      }
    >
      {children}
    </LayoutShell>
  );
}
