'use client';

/**
 * Persistent tab nav at the top of every /admin/settings page.
 *
 * Picks the active tab by pathname prefix instead of hash (the way
 * UrlSyncedTabs does) because Settings tabs are full routes, not in-page
 * views — that lets each tab fetch data server-side and own its own URL.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Server, Globe, Package, Briefcase, Plug, Percent, Mail } from 'lucide-react';
import type { ComponentType } from 'react';

type Tab = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const TABS: Tab[] = [
  { href: '/admin/settings/plans',        label: 'Hosting Plans', icon: Server },
  { href: '/admin/settings/tlds',         label: 'Domain TLDs',   icon: Globe },
  { href: '/admin/settings/addons',       label: 'Add-ons',       icon: Package },
  { href: '/admin/settings/services',     label: 'Services',      icon: Briefcase },
  { href: '/admin/settings/promotions',   label: 'Promotions',    icon: Percent },
  { href: '/admin/settings/emails',       label: 'Emails',        icon: Mail },
  { href: '/admin/settings/integrations', label: 'Integrations',  icon: Plug },
];

export function SettingsTabs() {
  const pathname = usePathname() ?? '';

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
      {TABS.map(tab => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
