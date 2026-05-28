'use client';

import {
  Globe, Globe2, CreditCard, MessageCircle,
  Settings, Shield, LayoutDashboard,
} from 'lucide-react';
import { isStaffRole } from '@/lib/roles';
import { LayoutShell, ShellAvatarDropdown, type NavItem } from './layout-shell';

interface DashboardUser {
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
}

const nav: NavItem[] = [
  { name: 'Overview', href: '/dashboard',          icon: LayoutDashboard },
  { name: 'Sites',    href: '/dashboard/sites',    icon: Globe },
  { name: 'Domains',  href: '/dashboard/domains',  icon: Globe2 },
  { name: 'Tickets',  href: '/dashboard/tickets',  icon: MessageCircle },
  { name: 'Billing',  href: '/dashboard/billing',  icon: CreditCard },
];

const ACCENT = {
  active: 'bg-gray-900 text-white font-medium shadow-sm',
  inactive: 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
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
  // Audience-specific menu items inside the avatar dropdown.
  const dropdownItems: any[] = [
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];
  if (isStaffRole(user.role)) {
    dropdownItems.push({ divider: true }, { label: 'Staff Panel', href: '/admin', icon: Shield });
  }

  return (
    <LayoutShell
      variant="light"
      brand={{ href: '/dashboard', mark: '/assets/Logo/envosta-logo-mark-dark.svg', label: 'Envosta' }}
      nav={nav}
      accent={ACCENT}
      topBanner={impersonationBanner}
      headerRight={<ShellAvatarDropdown user={user} items={dropdownItems} />}
    >
      {children}
    </LayoutShell>
  );
}
