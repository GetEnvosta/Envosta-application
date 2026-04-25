'use client';

import {
  LayoutDashboard, Users, MessageCircle, DollarSign, UserCircle, ArrowLeft,
} from 'lucide-react';
import { LayoutShell, ShellAvatarDropdown, type NavItem } from './layout-shell';

interface PartnerUser {
  full_name: string | null;
  email: string;
}

const nav: NavItem[] = [
  { name: 'Dashboard', href: '/partner',          icon: LayoutDashboard },
  { name: 'Clients',   href: '/partner/clients',  icon: Users },
  { name: 'Tickets',   href: '/partner/tickets',  icon: MessageCircle },
  { name: 'Earnings',  href: '/partner/earnings', icon: DollarSign },
  { name: 'Profile',   href: '/partner/profile',  icon: UserCircle },
];

export function PartnerShell({ user, children }: { user: PartnerUser; children: React.ReactNode }) {
  return (
    <LayoutShell
      variant="light"
      brand={{ href: '/partner', mark: '/assets/Logo/envosta-logo-mark-dark.svg', label: 'Partner' }}
      nav={nav}
      accent={{
        active: 'bg-sky-600 text-white font-medium shadow-sm',
        inactive: 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
      }}
      headerRight={
        <ShellAvatarDropdown user={user} items={[
          { label: 'Customer View', href: '/dashboard', icon: ArrowLeft },
        ]} />
      }
    >
      {children}
    </LayoutShell>
  );
}
