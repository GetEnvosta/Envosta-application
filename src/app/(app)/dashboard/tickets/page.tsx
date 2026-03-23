import Link from 'next/link';
import { getUserTickets } from '@/services/tickets';
import { ExternalLink, Plus } from 'lucide-react';

function TypeBadge({ type }: { type: string }) {
  if (type === 'studio') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
        Studio
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      Support
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-yellow-100 text-yellow-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    quoted: 'bg-purple-100 text-purple-700',
    approved: 'bg-green-100 text-green-700',
    completed: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-600',
  };

  const label = status
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        styles[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
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
  const tickets = await getUserTickets(typeFilter);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">Tickets</h1>
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {tickets.length}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Manage your support tickets and studio requests</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/tickets/new?type=support"
            className="btn-primary inline-flex items-center gap-1.5 text-sm"
          >
            <Plus className="w-4 h-4" />
            New Support Ticket
          </Link>
          <Link
            href="/dashboard/tickets/new?type=studio"
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 font-medium hover:bg-purple-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Studio Request
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { label: 'All', value: 'all' },
          { label: 'Support', value: 'support' },
          { label: 'Studio', value: 'studio' },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === 'all' ? '/dashboard/tickets' : `/dashboard/tickets?type=${tab.value}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              typeFilter === tab.value
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket list */}
        <div className="lg:col-span-2 space-y-3">
          {tickets.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-gray-500 text-sm">No tickets yet.</p>
              <p className="text-gray-400 text-xs mt-1">
                Create a support ticket or studio request to get started.
              </p>
            </div>
          ) : (
            tickets.map((ticket: any) => {
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
            })
          )}
        </div>

        {/* Envosta Studio promo */}
        <div className="lg:col-span-1">
          <div className="relative rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-white to-blue-50/60 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Need a custom website?
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Our studio team designs and builds high-performance websites tailored to
              your brand. From concept to launch, we handle everything.
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="badge-indigo">Custom Design</span>
              <span className="badge-indigo">SEO Optimized</span>
              <span className="badge-indigo">Launch in 5 Days</span>
            </div>
            <a
              href="https://envosta.com/studio"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-1.5"
            >
              Learn More <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
