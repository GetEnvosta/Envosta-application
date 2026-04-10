'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, AlertTriangle, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  sender: string;
  message: string;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  type: string;
  status: string;
  escalated_to_admin: boolean;
  users: { full_name: string; email: string } | null;
  messages: Message[];
}

export default function PartnerTicketDetailPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadTicket() {
    const res = await fetch(`/api/partners/tickets?ticketId=${id}`);
    // We need a dedicated endpoint; for now use the list and filter
    // Actually let's just fetch from the API and handle it
    setLoading(false);
  }

  useEffect(() => {
    fetch('/api/partners/tickets')
      .then((r) => r.json())
      .then((tickets) => {
        const found = tickets.find((t: any) => t.id === id);
        if (found) {
          // Load messages separately
          fetch(`/api/partners/tickets?ticketId=${id}`)
            .then(() => {
              // For now set what we have
              setTicket({ ...found, messages: [] });
            });
        }
      })
      .finally(() => setLoading(false));

    // Load ticket with messages via dedicated fetch
    const loadFull = async () => {
      try {
        const res = await fetch(`/api/partners/tickets`);
        const tickets = await res.json();
        const found = tickets.find((t: any) => t.id === id);
        if (found) setTicket({ ...found, messages: found.messages ?? [] });
      } catch {}
      setLoading(false);
    };
    loadFull();
  }, [id]);

  async function handleSend(escalate = false) {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await fetch('/api/partners/tickets/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: id, message: reply.trim(), escalate }),
      });
      setReply('');
      // Reload
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  if (!ticket) {
    return (
      <div>
        <Link href="/partner/tickets" className="inline-flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700 font-medium mb-6">
          <ArrowLeft className="w-4 h-4" /> Tickets
        </Link>
        <div className="card p-12 text-center text-sm text-gray-500">Ticket not found.</div>
      </div>
    );
  }

  const isClosed = ticket.status === 'closed' || ticket.status === 'completed';

  return (
    <div>
      <Link href="/partner/tickets" className="inline-flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700 font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Tickets
      </Link>

      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{ticket.subject}</h1>
            <p className="text-sm text-gray-500">
              {ticket.users?.full_name ?? ticket.users?.email ?? 'Client'} — {ticket.type}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {ticket.escalated_to_admin && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" /> Escalated to Envosta
              </span>
            )}
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              ticket.status === 'open' ? 'bg-amber-100 text-amber-700' :
              ticket.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
              isClosed ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-700'
            }`}>{ticket.status}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3 mb-6">
        {(ticket.messages ?? []).map((msg) => {
          const isPartner = msg.sender === 'partner';
          const isCustomer = msg.sender === 'customer';
          return (
            <div key={msg.id} className={`flex ${isPartner ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                isPartner ? 'bg-sky-600 text-white' :
                isCustomer ? 'bg-white border border-gray-200 text-gray-900' :
                'bg-gray-100 text-gray-600'
              }`}>
                <p className={`text-xs font-medium mb-1 ${isPartner ? 'text-sky-100' : 'text-gray-400'}`}>
                  {msg.sender === 'partner' ? 'You' : msg.sender === 'customer' ? 'Client' : msg.sender === 'admin' ? 'Envosta' : 'System'}
                </p>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <p className={`text-[10px] mt-1 ${isPartner ? 'text-sky-200' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply Form */}
      {!isClosed && (
        <div className="card p-4">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none resize-none mb-3"
          />
          <div className="flex items-center justify-between">
            {!ticket.escalated_to_admin && (
              <button
                onClick={() => handleSend(true)}
                disabled={sending || !reply.trim()}
                className="inline-flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium disabled:opacity-50"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Send & Escalate to Envosta
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={() => handleSend(false)}
              disabled={sending || !reply.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
