'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Send, Loader2 } from 'lucide-react';

export function TicketReplyForm({
  ticketId,
  ticketStatus,
}: {
  ticketId: string;
  ticketStatus: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      const supabase = createClient();

      // Insert admin reply
      const { error: msgError } = await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        sender: 'admin',
        message: message.trim(),
        is_draft: false,
      });

      if (msgError) throw msgError;

      // Update ticket status to in-progress if currently open
      if (ticketStatus === 'open') {
        await supabase
          .from('tickets')
          .update({ status: 'in-progress', updated_at: new Date().toISOString() })
          .eq('id', ticketId);
      } else {
        await supabase
          .from('tickets')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', ticketId);
      }

      setMessage('');
      router.refresh();
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card p-5">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Reply</h3>
      <form onSubmit={handleSendReply}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your reply..."
          rows={4}
          className="input w-full resize-none mb-3"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={!message.trim() || sending}
            className="btn-admin text-sm py-2 px-4 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send Reply
          </button>
        </div>
      </form>
    </div>
  );
}
