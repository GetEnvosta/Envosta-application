export const revalidate = 5;
import { getAllCustomers } from '@/services/admin';
import { getPartnerApplications } from '@/services/partners';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Search, Users, Server, Globe, UserCheck, Handshake, Eye } from 'lucide-react';
import { getCurrentUser, getUserProfile } from '@/services/auth';
import { CustomersHeader } from './customers-header';
import { UsersTabs } from './users-tabs';
import { ROLE_BADGE_CLASSES } from '@/lib/roles';
import { PartnerActions } from '@/app/(app)/admin/partners/partner-actions';
import { StatCard } from '@/components/admin/stat-card';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { q } = await searchParams;
  const [allUsers, partnerApps] = await Promise.all([
    getAllCustomers(q),
    getPartnerApplications(),
  ]);
  const currentUser = await getCurrentUser();
  const currentProfile = currentUser ? await getUserProfile(currentUser.id) : null;
  const isAdmin = currentProfile?.role === 'admin';

  const customers = allUsers.filter((u: any) => u.role === 'customer');
  const partners = allUsers.filter((u: any) => u.role === 'partner');
  const staff = allUsers.filter((u: any) => ['admin', 'staff', 'affiliate'].includes(u.role));

  const activeCustomers = customers.filter((u: any) => u.sub_status === 'active' || u.sub_status === 'trialing').length;
  const withSites = customers.filter((u: any) => u.site_count > 0).length;

  /**
   * Derive display status for a user row:
   * - If they have an active/trialing subscription → show that status
   * - If subscription is past_due / paused / on_hold → show that
   * - If no sites, no domains, and no subscription → "inactive"
   * - Unclaimed accounts → "unclaimed"
   */
  function deriveStatus(u: any): { label: string; className: string } {
    if (u.sub_status === 'active') return { label: 'active', className: 'bg-emerald-50 text-emerald-700' };
    if (u.sub_status === 'trialing') return { label: 'trialing', className: 'bg-blue-50 text-blue-700' };
    if (u.sub_status === 'past_due') return { label: 'past due', className: 'bg-red-50 text-red-700' };
    if (u.sub_status === 'paused') return { label: 'paused', className: 'bg-amber-50 text-amber-700' };
    if (u.sub_status === 'incomplete') return { label: 'incomplete', className: 'bg-orange-50 text-orange-700' };
    if (u.sub_status === 'canceled' || u.sub_status === 'cancelled') return { label: 'cancelled', className: 'bg-red-50 text-red-600' };
    if (u.claimed === false) return { label: 'unclaimed', className: 'bg-amber-50 text-amber-700' };
    if (u.site_count === 0 && u.domain_count === 0) return { label: 'inactive', className: 'bg-gray-100 text-gray-500' };
    return { label: 'inactive', className: 'bg-gray-100 text-gray-500' };
  }

  function UserTable({ users }: { users: any[] }) {
    return (
      <div className="card overflow-hidden">
        {/* Search inside card */}
        <form method="GET" className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" name="q" defaultValue={q ?? ''} placeholder="Search by name or email..." className="input pl-9 w-full" />
          </div>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-center">Sites</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-center">Domains</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">{q ? 'No users match your search.' : 'No users in this category.'}</p>
                </td></tr>
              ) : users.map((u: any) => {
                const status = deriveStatus(u);
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/customers/${u.id}`} className="text-sm font-medium text-admin-600 hover:text-admin-700">
                        {u.full_name || 'Unnamed'}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 text-xs">{u.email}</td>
                    <td className="px-5 py-3.5 text-center">
                      {u.site_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700"><Server className="w-3 h-3 text-gray-400" />{u.site_count}</span>
                      ) : <span className="text-xs text-gray-300">0</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {u.domain_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700"><Globe className="w-3 h-3 text-gray-400" />{u.domain_count}</span>
                      ) : <span className="text-xs text-gray-300">0</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE_CLASSES[u.role] || 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">{formatDate(u.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/customers/${u.id}`}
                        className="inline-flex items-center gap-1 text-xs text-admin-600 hover:text-admin-700 font-medium">
                        <Eye className="w-3.5 h-3.5" /> View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Partner applications (pending)
  const pendingPartners = partnerApps.filter((p: any) => p.partner_status === 'pending');

  return (
    <div>
      <CustomersHeader isAdmin={isAdmin} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users" value={allUsers.length} icon={Users} color="blue" />
        <StatCard label="Active Customers" value={activeCustomers} icon={UserCheck} color="green" />
        <StatCard label="Partners" value={partners.length} icon={Handshake} color="purple" />
        <StatCard label="With Sites" value={withSites} icon={Server} color="cyan" />
      </div>

      <UsersTabs>
        {{
          customers: <UserTable users={customers} />,

          partners: (
            <div className="space-y-6">
              {pendingPartners.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Pending Applications ({pendingPartners.length})</h3>
                  <div className="card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Specializations</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Applied</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {pendingPartners.map((p: any) => (
                          <tr key={p.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5"><span className="text-sm font-medium text-gray-900">{p.full_name ?? 'Unknown'}</span> <span className="text-xs text-gray-400">{p.email}</span></td>
                            <td className="px-4 py-2.5"><div className="flex flex-wrap gap-1">{(p.specializations ?? []).slice(0, 3).map((s: string) => <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{s}</span>)}</div></td>
                            <td className="px-4 py-2.5 text-sm text-gray-500">{formatDate(p.partner_applied_at)}</td>
                            <td className="px-4 py-2.5 text-right"><PartnerActions userId={p.id} status={p.partner_status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <UserTable users={partners} />
            </div>
          ),

          staff: <UserTable users={staff} />,
        }}
      </UsersTabs>
    </div>
  );
}
