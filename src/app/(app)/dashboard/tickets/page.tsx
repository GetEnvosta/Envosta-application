import Link from 'next/link';
import { getUserTickets } from '@/services/tickets';
import { getEffectiveUserId } from '@/services/auth';
import { ExternalLink, Plus, Paintbrush, Wrench } from 'lucide-react';

function TypeBadge({ type }: { type: string }) {
  if (type === 'studio') {
    return <span className="badge-purple">Studio</span>;
  }
  return <span className="badge-blue">Technical</span>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'badge-yellow',
    'in-progress': 'badge-blue',
    quoted: 'badge-purple',
    approved: 'badge-green',
    completed: 'badge-green',
    closed: 'badge-gray',
  };

  const label = status
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <span className={styles[status] ?? 'badge-gray'}>
      {label}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const typeFilter = params.type ?? 'all';
  const userId = await getEffectiveUserId();
  const tickets = await getUserTickets(typeFilter, userId!);

  const studioCount = tickets.filter((t: any) => t.type === 'studio').length;
  const techCount = tickets.filter((t: any) => t.type === 'support').length;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Requests &amp; Support</h1>
          <p className="text-sm text-gray-500 mt-1">Submit design requests or report technical issues.</p>
        </div>
      </div>

      {/* Studio CTA — front and center */}
      <div className="relative rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 via-white to-indigo-50 p-6 mb-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-100/30 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Paintbrush className="w-5 h-5 text-purple-600" />
                <h2 className="text-base font-semibold text-gray-900">Envosta Studio</h2>
                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full font-medium">from $250 CAD</span>
              </div>
              <p className="text-sm text-gray-600 max-w-lg">
                Need design changes, new pages, plugin setup, content updates, or new features?
                Our team handles it — no technical knowledge needed. Just describe what you want.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                <span>Page design</span>
                <span>New features</span>
                <span>Plugin setup</span>
                <span>Content updates</span>
                <span>WooCommerce</span>
                <span>3–5 day delivery</span>
              </div>
            </div>
            <Link
              href="/dashboard/tickets/new?type=studio"
              className="inline-flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              New Studio Request
            </Link>
          </div>
        </div>
      </div>

      {/* Filter tabs + tech issue button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex gap-2">
          {[
            { label: 'All', value: 'all', count: tickets.length },
            { label: 'Studio Requests', value: 'studio', count: studioCount },
            { label: 'Technical Issues', value: 'support', count: techCount },
          ].map((tab) => (
            <Link
              key={tab.value}
              href={tab.value === 'all' ? '/dashboard/tickets' : `/dashboard/tickets?type=${tab.value}`}
              className={typeFilter === tab.value ? 'filter-pill-active' : 'filter-pill-inactive'}
            >
              {tab.label} {tab.count > 0 && <span className="ml-1 opacity-60">{tab.count}</span>}
            </Link>
          ))}
        </div>
        <Link
          href="/dashboard/tickets/new?type=support"
          className="inline-flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          <Wrench className="w-3.5 h-3.5" />
          Report Technical Issue
        </Link>
      </div>

      {/* Ticket list */}
      {tickets.length === 0 ? (
        <div className="card p-12 text-center">
          <Paintbrush className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">No requests yet</p>
          <p className="text-xs text-gray-400 mb-4">Submit a studio request or report a technical issue.</p>
          <Link
            href="/dashboard/tickets/new?type=studio"
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Studio Request
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket: any) => {
            const messages = ticket.ticket_messages ?? [];
            const sorted = [...messages].sort(
              (a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            const lastMessage = sorted[0];

            return (
              <Link
                key={ticket.id}
                href={`/dashboard/tickets/${ticket.id}`}
                className="card p-5 block hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <TypeBadge type={ticket.type} />
                    <span className="text-sm font-medium text-gray-900">
                      {ticket.subject}
                    </span>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>
                {lastMessage && (
                  <p className="text-sm text-gray-500 line-clamp-1">
                    {lastMessage.message}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {formatDate(ticket.created_at)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
