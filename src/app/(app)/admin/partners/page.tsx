import { getPartnerApplications, getPartnerChangeRequests } from '@/services/partners';
import { formatDate, statusColor } from '@/lib/utils';
import { Handshake, Clock, Users, AlertCircle, Star } from 'lucide-react';
import { PartnerActions } from './partner-actions';

export default async function AdminPartnersPage() {
  const [applications, changeRequests] = await Promise.all([
    getPartnerApplications(),
    getPartnerChangeRequests('pending'),
  ]);

  const pending = applications.filter((p: any) => p.status === 'pending');
  const approved = applications.filter((p: any) => p.status === 'approved');
  const suspended = applications.filter((p: any) => p.status === 'suspended');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Partner Management</h1>
        <p className="text-sm text-gray-500">Review applications, manage active partners, and handle change requests.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{approved.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Suspended</p>
          <p className="text-2xl font-bold text-red-600">{suspended.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Change Requests</p>
          <p className="text-2xl font-bold text-blue-600">{changeRequests.length}</p>
        </div>
      </div>

      {/* Pending Applications */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Pending Applications ({pending.length})
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Applicant</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Specializations</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Applied</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pending.map((p: any) => (
                  <tr key={p.user_id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{p.users?.full_name ?? 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{p.users?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(p.specializations ?? []).slice(0, 3).map((s: string) => (
                          <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(p.applied_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <PartnerActions userId={p.user_id} status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Active Partners */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-500" />
          Active Partners ({approved.length})
        </h2>
        {approved.length > 0 ? (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Partner</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Specializations</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Featured</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Approved</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {approved.map((p: any) => (
                  <tr key={p.user_id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <a href={`/admin/partners/${p.user_id}`} className="hover:text-admin-600">
                        <p className="text-sm font-medium text-gray-900">{p.users?.full_name ?? 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{p.users?.email}</p>
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(p.specializations ?? []).slice(0, 3).map((s: string) => (
                          <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.featured ? (
                        <span className="text-xs text-sky-600 font-medium">Featured</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(p.approved_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <PartnerActions userId={p.user_id} status={p.status} featured={p.featured} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card p-8 text-center text-sm text-gray-500">No active partners yet.</div>
        )}
      </section>

      {/* Change Requests */}
      {changeRequests.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-500" />
            Pending Change Requests ({changeRequests.length})
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Client</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Current Partner</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Reason</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Date</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {changeRequests.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm text-gray-900">{r.client?.full_name ?? r.client?.email ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.partner?.full_name ?? r.partner?.email ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{r.reason ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <ChangeRequestActions requestId={r.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

// Inline client components for actions
function ChangeRequestActions({ requestId }: { requestId: string }) {
  return <ChangeRequestActionsClient requestId={requestId} />;
}

import { ChangeRequestActionsClient } from './change-request-actions';
