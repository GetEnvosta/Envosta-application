'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Loader2 } from 'lucide-react';

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      const { error: msgError } = await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        sender: 'customer',
        message: message.trim(),
      });

      if (msgError) {
        setError(msgError.message);
        setLoading(false);
        return;
      }

      // Update ticket updated_at
      await supabase
        .from('tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      setMessage('');
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? 'Failed to send reply.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Reply</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <textarea
          className="input mb-3"
          rows={4}
          required
          placeholder="Type your reply..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="btn-primary inline-flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Sending...
            </>
          ) : (
            'Send Reply'
          )}
        </button>
      </form>
    </div>
  );
}
