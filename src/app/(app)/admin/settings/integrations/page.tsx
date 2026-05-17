export const revalidate = 60;

import { Network, KeyRound, ExternalLink, Server, Globe, CreditCard, Mail } from 'lucide-react';
import { ConnectivityButton } from './connectivity-button';

interface EnvSection {
  group: string;
  icon: typeof Server;
  vars: { key: string; required: boolean; note?: string }[];
}

const ENV_GROUPS: EnvSection[] = [
  {
    group: 'wp.cloud (Atomic)',
    icon: Server,
    vars: [
      { key: 'WPCLOUD_API_KEY',  required: true },
      { key: 'WPCLOUD_CLIENT',   required: false, note: 'defaults to "envosta"' },
      { key: 'WPCLOUD_BASE_URL', required: false, note: 'defaults to https://atomic-api.wordpress.com' },
    ],
  },
  {
    group: 'OpenSRS',
    icon: Globe,
    vars: [
      { key: 'OPENSRS_API_KEY',  required: true },
      { key: 'OPENSRS_USERNAME', required: true },
      { key: 'OPENSRS_HOST',     required: false, note: 'defaults to horizon.opensrs.net (test)' },
    ],
  },
  {
    group: 'Stripe',
    icon: CreditCard,
    vars: [
      { key: 'STRIPE_SECRET_KEY',     required: true },
      { key: 'STRIPE_WEBHOOK_SECRET', required: true },
    ],
  },
  {
    group: 'Supabase',
    icon: KeyRound,
    vars: [
      { key: 'NEXT_PUBLIC_SUPABASE_URL',             required: true },
      { key: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', required: true },
      { key: 'SUPABASE_SECRET_KEY',                  required: true, note: 'service-role; never exposed to browser' },
    ],
  },
  {
    group: 'Email (Resend / SES)',
    icon: Mail,
    vars: [
      { key: 'RESEND_API_KEY',        required: false },
      { key: 'NOTIFICATION_FROM',     required: false, note: 'defaults to noreply@envosta.com' },
    ],
  },
];

const STATIC_IPS = [
  { ip: '184.72.2.216',  opensrs: true, wpcloud: true },
  { ip: '54.241.78.174', opensrs: true, wpcloud: true },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Integrations</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Static IPs, env-var checklist, and a one-click connectivity probe.
          Actual env-var values live in Vercel and are not editable here.
        </p>
      </div>

      {/* Static IPs */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Network className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-900">Outbound Static IPs</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          All outbound traffic from Vercel Functions to whitelisted upstreams originates from one of these IPs.
        </p>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">OpenSRS</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">wp.cloud</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {STATIC_IPS.map(row => (
                <tr key={row.ip}>
                  <td className="px-3 py-2 font-mono text-gray-900">{row.ip}</td>
                  <td className="px-3 py-2 text-emerald-700 text-xs">{row.opensrs ? 'Whitelisted' : '—'}</td>
                  <td className="px-3 py-2 text-emerald-700 text-xs">{row.wpcloud ? 'Whitelisted' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Source of truth: <span className="font-mono">docs/static-ips.md</span>. To self-test live, click below.
        </p>
        <div className="mt-3">
          <ConnectivityButton />
        </div>
      </div>

      {/* Env vars */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-900">Required Environment Variables</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Values live in Vercel project settings. This is a read-only checklist of the keys we expect to be present.
          To rotate or set a value: <a className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5"
            href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">
            Vercel dashboard <ExternalLink className="w-3 h-3" />
          </a>.
        </p>
        <div className="space-y-5">
          {ENV_GROUPS.map(group => (
            <div key={group.group}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <group.icon className="w-3.5 h-3.5 text-gray-400" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{group.group}</h4>
              </div>
              <ul className="space-y-1">
                {group.vars.map(v => (
                  <li key={v.key} className="flex items-baseline gap-3 text-sm">
                    <code className="font-mono text-xs text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">{v.key}</code>
                    {v.required
                      ? <span className="text-[10px] uppercase tracking-wider text-red-600">required</span>
                      : <span className="text-[10px] uppercase tracking-wider text-gray-400">optional</span>}
                    {v.note && <span className="text-xs text-gray-400">— {v.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
