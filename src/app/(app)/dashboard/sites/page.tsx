import { createClient } from '@/lib/supabase-server';
import { formatDate, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { Plus, ExternalLink, Server } from 'lucide-react';

export default async function SitesPage() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from('services').select('*, plans(name)').order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sites</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your WordPress hosting accounts</p>
        </div>
        <Link href="/dashboard/sites/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New site
        </Link>
      </div>

      {(!services || services.length === 0) ? (
        <div className="card p-12 text-center">
          <Server className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900">No sites yet</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">Create your first WordPress site to get started.</p>
          <Link href="/dashboard/sites/new" className="btn-primary">Create site</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Site</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Plan</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Region</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Created</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {services.map((s: any) => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-900">{s.label}</p>
                    {s.wp_cloud_url && (
                      <p className="text-xs text-gray-500 mt-0.5">{s.wp_cloud_url}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <span className="text-sm text-gray-600">{(s as any).plans?.name ?? '—'}</span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="text-sm text-gray-600 font-mono">{s.server_region}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={statusColor(s.status)}>{s.status}</span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="text-sm text-gray-500">{formatDate(s.created_at)}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {s.wp_cloud_url && (
                      <a href={s.wp_cloud_url} target="_blank" rel="noopener noreferrer"
                        className="btn-ghost text-xs py-1.5 px-2.5">
                        <ExternalLink className="w-3.5 h-3.5" /> Visit
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
