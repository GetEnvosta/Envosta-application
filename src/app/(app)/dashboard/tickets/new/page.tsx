'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { ArrowLeft, Loader2, Paintbrush } from 'lucide-react';

export default function NewTicketPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketType = searchParams.get('type') === 'studio' ? 'studio' : 'support';

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [siteId, setServiceId] = useState('');
  const [services, setServices] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ticketType === 'studio') {
      const supabase = createClient();
      supabase
        .from('sites')
        .select('id, label')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setServices(data ?? []);
        });
    }
  }, [ticketType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be logged in.');
        setLoading(false);
        return;
      }

      // Insert ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          user_id: user.id,
          type: ticketType,
          subject,
          status: 'open',
          priority: ticketType === 'support' ? priority : 'normal',
          metadata: {
            ...(ticketType === 'studio' && siteId ? { site_id: siteId } : {}),
          },
        })
        .select('id')
        .single();

      if (ticketError || !ticket) {
        setError(ticketError?.message ?? 'Failed to create ticket.');
        setLoading(false);
        return;
      }

      // Insert first message
      const { error: msgError } = await supabase.from('ticket_messages').insert({
        ticket_id: ticket.id,
        sender: 'customer',
        message,
      });

      if (msgError) {
        setError(msgError.message);
        setLoading(false);
        return;
      }

      router.push('/dashboard/tickets');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.');
      setLoading(false);
    }
  }

  return (
    <div>
      <Link
        href="/dashboard/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tickets
      </Link>

      <h1 className="text-xl font-semibold text-gray-900 mb-1">
        {ticketType === 'studio' ? 'New Studio Request' : 'New Support Ticket'}
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        {ticketType === 'studio'
          ? 'Describe what you need and we will get back to you with a quote.'
          : 'Tell us about your issue and we will get back to you as soon as possible.'}
      </p>

      <div className="max-w-2xl">
        <div className="card p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {ticketType === 'studio' && (
            <div className="rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-5 mb-6">
              <div className="flex items-start gap-3">
                <Paintbrush className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    Envosta Studio
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Design requests start at $250 CAD. We&apos;ll review and send a quote.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Subject</label>
              <input
                type="text"
                className="input"
                required
                placeholder={
                  ticketType === 'studio'
                    ? 'e.g. Redesign my homepage hero section'
                    : 'Brief summary of your issue'
                }
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {ticketType === 'studio' && (
              <div>
                <label className="label">Site</label>
                <select
                  className="input"
                  value={siteId}
                  onChange={(e) => setServiceId(e.target.value)}
                >
                  <option value="">Select a site (optional)</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="label">
                {ticketType === 'studio' ? 'Description' : 'Message'}
              </label>
              <textarea
                className="input"
                rows={ticketType === 'studio' ? 6 : 4}
                required
                placeholder={
                  ticketType === 'studio'
                    ? 'Include as much detail as possible: what you want changed, reference links, brand colors, copy text, etc.'
                    : 'Describe your issue in detail...'
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {ticketType === 'support' && (
              <div>
                <label className="label">Priority</label>
                <select
                  className="input"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary inline-flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </>
              ) : ticketType === 'studio' ? (
                'Submit Studio Request'
              ) : (
                'Submit Ticket'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
