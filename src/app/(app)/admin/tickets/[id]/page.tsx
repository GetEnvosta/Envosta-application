import { getAdminTicketDetail } from '@/services/tickets';
import { formatDateTime } from '@/lib/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { TicketReplyForm } from '@/components/admin/ticket-reply-form';
import { TicketSidebar } from '@/components/admin/ticket-sidebar';
import { StudioProgressBar, StudioStageAdvancer } from '@/components/admin/studio-progress';
import { SalesProgressBar, SalesStageAdvancer } from '@/components/admin/sales-progress';

function typeBadge(type: string) {
  switch (type) {
    case 'support': return 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20';
    case 'studio': return 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20';
    case 'sales': return 'bg-green-50 text-green-700 ring-1 ring-green-600/20';
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

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getAdminTicketDetail(id);

  if (!result) notFound();

  const { ticket, customerContext } = result;
  const messages = (ticket.ticket_messages as any[]) ?? [];

  // Sort messages by created_at ascending
  messages.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div>
      {/* Back link */}
      <Link
        href="/admin/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tickets
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h1 className="text-xl font-semibold text-gray-900">{ticket.subject}</h1>
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${typeBadge(ticket.type)}`}>
            {ticket.type}
          </span>
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${statusBadge(ticket.status)}`}>
            {ticket.status}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Created {formatDateTime(ticket.created_at)}
          {ticket.source && <span> &middot; Source: {ticket.source}</span>}
        </p>
      </div>

      {/* Studio progress tracker */}
      {ticket.type === 'studio' && (
        <>
          <StudioProgressBar currentStage={(ticket.metadata as any)?.studio_stage ?? 'submitted'} />
          <StudioStageAdvancer ticketId={ticket.id} currentStage={(ticket.metadata as any)?.studio_stage ?? 'submitted'} />
        </>
      )}

      {/* Sales pipeline tracker */}
      {ticket.type === 'sales' && (
        <>
          <SalesProgressBar currentStage={(ticket.metadata as any)?.sales_stage ?? 'inquiry'} />
          <SalesStageAdvancer ticketId={ticket.id} currentStage={(ticket.metadata as any)?.sales_stage ?? 'inquiry'} />
        </>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - messages */}
        <div className="lg:col-span-2 space-y-4">
          {/* Message thread */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              Conversation ({messages.length})
            </h3>

            {messages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No messages yet.</p>
            ) : (
              <div className="space-y-4">
                {messages.map((msg: any) => {
                  const isAdmin = msg.sender === 'admin';
                  const isDraft = msg.is_draft;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-3 ${
                          isDraft
                            ? 'bg-amber-50 border border-amber-200 border-dashed'
                            : isAdmin
                            ? 'bg-admin-50 border border-admin-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${
                            isDraft ? 'text-amber-600' : isAdmin ? 'text-admin-600' : 'text-gray-600'
                          }`}>
                            {isDraft ? 'AI Draft' : isAdmin ? 'Admin' : 'Customer'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDateTime(msg.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reply form */}
          <TicketReplyForm ticketId={ticket.id} ticketStatus={ticket.status} />
        </div>

        {/* Right column - sidebar */}
        <div className="lg:col-span-1">
          <TicketSidebar ticket={ticket} customerContext={customerContext} />
        </div>
      </div>
    </div>
  );
}
