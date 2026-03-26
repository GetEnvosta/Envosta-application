'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { ArrowLeft, Loader2, Send } from 'lucide-react';

export default function NewTicketPage() {
  const router = useRouter();
  const [ticketType, setTicketType] = useState('sales');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !subject.trim() || !description.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const supabase = createClient();

      const { data: ticket, error: insertError } = await supabase
        .from('tickets')
        .insert({
          contact_name: contactName.trim(),
          contact_email: contactEmail.trim(),
          subject: subject.trim(),
          type: ticketType,
          source: 'manual',
          status: 'open',
          priority: 'normal',
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Insert the initial message
      if (ticket) {
        await supabase.from('ticket_messages').insert({
          ticket_id: ticket.id,
          sender: 'customer',
          message: description.trim(),
          is_draft: false,
        });
      }

      router.push('/admin/tickets');
    } catch (err: any) {
      console.error('Failed to create ticket:', err);
      setError(err.message || 'Failed to create ticket.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Link
        href="/admin/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tickets
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Create Ticket</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manually create a ticket on behalf of a customer.
        </p>
      </div>

      <div className="card p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ticket Type</label>
            <div className="flex gap-2">
              {[
                { value: 'sales', label: 'Sales', color: 'green' },
                { value: 'support', label: 'Technical', color: 'blue' },
                { value: 'studio', label: 'Studio', color: 'purple' },
              ].map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTicketType(t.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    ticketType === t.value
                      ? t.color === 'green' ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
                      : t.color === 'blue' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                      : 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contact Name
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="John Doe"
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="john@example.com"
                className="input w-full"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Interested in website redesign"
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the inquiry or lead details..."
              rows={5}
              className="input w-full resize-none"
              required
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn-admin text-sm py-2.5 px-5 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Create Ticket
            </button>
            <Link
              href="/admin/tickets"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
