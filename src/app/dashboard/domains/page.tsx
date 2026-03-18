import { createClient } from '@/lib/supabase-server';
import { formatDate, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { Plus, Globe } from 'lucide-react';

export default async function DomainsPage() {
  const supabase = await createClient();
  const { data: domains } = await supabase
    .from('domains').select('*').order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Domains</h1>
          <p className="text-sm text-gray-500 mt-0.5">Register and manage your domain names</p>
        </div>
        <Link href="/dashboard/domains/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Register domain
        </Link>
      </div>

      {(!domains || domains.length === 0) ? (
        <div className="card p-12 text-center">
          <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900">No domains yet</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">Search and register your first domain name.</p>
          <Link href="/dashboard/domains/new" className="btn-primary">Register domain</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Domain</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Registered</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Expires</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Auto-renew</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {domains.map((d: any) => (
                <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-900">{d.domain_name}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={statusColor(d.status)}>{d.status}</span>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell text-sm text-gray-500">{formatDate(d.registration_date)}</td>
                  <td className="px-5 py-4 hidden md:table-cell text-sm text-gray-500">{formatDate(d.expiry_date)}</td>
                  <td className="px-5 py-4 hidden md:table-cell text-sm text-gray-500">{d.auto_renew ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
