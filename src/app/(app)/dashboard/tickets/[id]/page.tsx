import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTicketById } from '@/services/tickets';
import { getEffectiveUserId } from '@/services/auth';
import { ArrowLeft } from 'lucide-react';
import { TicketReplyForm } from './reply-form';
import { StudioProgressBar } from '@/components/admin/studio-progress';

function TypeBadge({ type }: { type: string }) {
  if (type === 'studio') {
    return <span className="badge-purple">Studio</span>;
  }
  return <span className="badge-blue">Support</span>;
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

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getEffectiveUserId();
  if (!userId) redirect('/login');

  const ticket = await getTicketById(id, userId);

  if (!ticket) {
    notFound();
  }

  const messages = [...(ticket.ticket_messages ?? [])].sort(
    (a: any, b: any) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const isClosed = ticket.status === 'closed' || ticket.status === 'completed';

  return (
    <div>
      <Link
        href="/dashboard/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tickets
      </Link>

      {/* Ticket header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <h1 className="text-xl font-semibold text-gray-900">{ticket.subject}</h1>
          <TypeBadge type={ticket.type} />
          <StatusBadge status={ticket.status} />
        </div>
        <p className="text-sm text-gray-500">
          Opened {formatDateTime(ticket.created_at)}
        </p>
      </div>

      {/* Studio progress tracker (customer view — read only) */}
      {ticket.type === 'studio' && (
        <StudioProgressBar currentStage={(ticket.metadata as any)?.studio_stage ?? 'submitted'} />
      )}

      {/* Message thread */}
      <div className="space-y-4 mb-8">
        {messages.map((msg: any) => {
          const isCustomer = msg.sender === 'customer';
          return (
            <div
              key={msg.id}
              className={`card p-5 ${
                isCustomer
                  ? 'border-l-4 border-l-blue-400'
                  : 'border-l-4 border-l-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {isCustomer ? 'You' : 'Envosta Team'}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDateTime(msg.created_at)}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {msg.message}
              </p>
            </div>
          );
        })}
      </div>

      {/* Reply form */}
      {isClosed ? (
        <div className="card p-5 text-center">
          <p className="text-sm text-gray-500">
            This ticket is {ticket.status}. If you need further help, please open a
            new ticket.
          </p>
        </div>
      ) : (
        <TicketReplyForm ticketId={ticket.id} />
      )}
    </div>
  );
}
