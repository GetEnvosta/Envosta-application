'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Globe, Globe2, CreditCard, Mail, MessageCircle, Users,
  Settings, Shield, LayoutDashboard, Building2,
} from 'lucide-react';
import { isStaffRole } from '@/lib/roles';
import { LayoutShell, ShellAvatarDropdown, type NavItem } from './layout-shell';

interface DashboardUser {
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
  partner_id?: string | null;
}

const nav: NavItem[] = [
  { name: 'Overview', href: '/dashboard',          icon: LayoutDashboard },
  { name: 'Business', href: '/dashboard/business', icon: Building2 },
  { name: 'Sites',    href: '/dashboard/sites',    icon: Globe },
  { name: 'Domains',  href: '/dashboard/domains',  icon: Globe2 },
  { name: 'Email',    href: '/dashboard/email',    icon: Mail },
  { name: 'Tickets',  href: '/dashboard/tickets',  icon: MessageCircle },
  { name: 'Billing',  href: '/dashboard/billing',  icon: CreditCard },
];

const ACCENT = {
  active: 'bg-gray-900 text-white font-medium shadow-sm',
  inactive: 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
};

const SECONDARY_ACCENT = {
  active: 'bg-gray-900 text-white font-medium shadow-sm',
  inactive: 'text-gray-400 hover:text-gray-700 hover:bg-gray-50',
};

export function DashboardShell({
  user,
  children,
  impersonationBanner,
}: {
  user: DashboardUser;
  children: React.ReactNode;
  impersonationBanner?: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  // Audience-specific menu items inside the avatar dropdown.
  const dropdownItems: any[] = [
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];
  if (isStaffRole(user.role)) {
    dropdownItems.push({ divider: true }, { label: 'Staff Panel', href: '/admin', icon: Shield });
  }

  // Conditional secondary nav. "Find a Partner" was removed (deprecated
  // marketplace flow) — only "My Partner" (for customers with a linked
  // partner) and "Partner Dashboard" (for partner-role users) remain.
  const showSecondaryNav = user.partner_id || user.role === 'partner';
  const sidebarExtras = showSecondaryNav ? (
    <div className="px-0 pt-3 mt-3 border-t border-gray-100 space-y-1">
      {user.partner_id && (
        <Link href="/dashboard/my-partner"
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-200',
            isActive('/dashboard/my-partner') ? SECONDARY_ACCENT.active : SECONDARY_ACCENT.inactive,
          )}>
          <Users className="w-[18px] h-[18px] shrink-0" /> My Partner
        </Link>
      )}
      {user.role === 'partner' && (
        <Link href="/partner"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-sky-600 hover:text-sky-700 hover:bg-sky-50 transition-all duration-200">
          <Users className="w-[18px] h-[18px] shrink-0" /> Partner Dashboard
        </Link>
      )}
    </div>
  ) : null;

  return (
    <LayoutShell
      variant="light"
      brand={{ href: '/dashboard', mark: '/assets/Logo/envosta-logo-mark-dark.svg', label: 'Envosta' }}
      nav={nav}
      accent={ACCENT}
      topBanner={impersonationBanner}
      headerRight={<ShellAvatarDropdown user={user} items={dropdownItems} />}
      sidebarExtras={sidebarExtras}
    >
      {children}
    </LayoutShell>
  );
}
