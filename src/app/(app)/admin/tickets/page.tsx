export const revalidate = 5;
import { getAllTickets, getTicketCounts } from '@/services/tickets';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Search, MessageSquare, Clock, AlertCircle, Inbox, Plus, Sparkles } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';

const TYPE_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Support', value: 'support' },
  { label: 'Studio', value: 'studio' },
  { label: 'Onboarding', value: 'onboarding' },
];

function typeBadge(type: string) {
  switch (type) {
    case 'support': return 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20';
    case 'studio': return 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20';
    case 'onboarding': return 'bg-green-50 text-green-700 ring-1 ring-green-600/20';
    default: return 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20';
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'open': return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20';
    case 'in-progress': return 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20';
    case 'resolved': return 'bg-green-50 text-green-700 ring-1 ring-green-600/20';
    case 'closed': return 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20';
    default: return 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20';
  }
}

function priorityBadge(priority: string) {
  switch (priority) {
    case 'urgent': return 'bg-red-50 text-red-700 ring-1 ring-red-600/20';
    case 'high': return 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20';
    case 'normal': return 'bg-gray-50 text-gray-600 ring-1 ring-gray-600/20';
    case 'low': return 'bg-gray-50 text-gray-400 ring-1 ring-gray-300/20';
    default: return 'bg-gray-50 text-gray-600 ring-1 ring-gray-600/20';
  }
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const typeFilter = params.type ?? 'all';
  const search = params.q ?? '';

  const [tickets, counts] = await Promise.all([
    getAllTickets({ type: typeFilter, q: search }),
    getTicketCounts(),
  ]);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage customer support, studio, and sales tickets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form action="/api/admin/draft-all-replies" method="POST">
            <button type="submit" className="btn-admin-secondary text-sm py-2 px-3.5 inline-flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Draft All Replies
            </button>
          </form>
          <Link
            href="/admin/tickets/new"
            className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Ticket
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <StatCard label="Open" value={counts.open} icon={AlertCircle} color="amber" />
        <StatCard label="In Progress" value={counts.inProgress} icon={Clock} color="blue" />
        <StatCard label="Total" value={counts.total} icon={Inbox} color="gray" />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-4">
        {TYPE_TABS.map(tab => {
          const isActive = typeFilter === tab.value;
          return (
            <Link
              key={tab.value}
              href={`/admin/tickets${tab.value === 'all' ? '' : `?type=${tab.value}`}${search ? `${tab.value === 'all' ? '?' : '&'}q=${search}` : ''}`}
              className={isActive ? 'filter-pill-active' : 'filter-pill-inactive'}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <form method="GET" className="filter-bar">
        {typeFilter !== 'all' && <input type="hidden" name="type" value={typeFilter} />}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Search by subject, name, or email..."
            className="input pl-9 w-full"
          />
        </div>
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                      {search ? 'No tickets match your search.' : 'No tickets yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                tickets.map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/tickets/${t.id}`}
                        className="text-sm font-medium text-admin-600 hover:text-admin-700"
                      >
                        {(t.users as any)?.full_name || t.contact_name || 'Unknown'}
                      </Link>
                      <p className="text-xs text-gray-400">
                        {(t.users as any)?.email || t.contact_email || ''}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${typeBadge(t.type)}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/tickets/${t.id}`}
                        className="text-sm text-gray-900 hover:text-admin-600"
                      >
                        {t.subject}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${statusBadge(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${priorityBadge(t.priority ?? 'normal')}`}>
                        {t.priority ?? 'normal'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                      {timeAgo(t.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
