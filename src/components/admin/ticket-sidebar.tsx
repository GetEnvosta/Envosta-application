'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { formatDate } from '@/lib/utils';
import { Save, Loader2, User, Mail, Globe, Calendar, Tag, Ticket, CircleDot, Layers } from 'lucide-react';

const STATUSES = ['open', 'in-progress', 'resolved', 'closed'] as const;
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export function TicketSidebar({
  ticket,
  customerContext,
}: {
  ticket: any;
  customerContext: any;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority ?? 'normal');
  const [quoteAmount, setQuoteAmount] = useState(ticket.quote_amount ?? '');
  const [adminNotes, setAdminNotes] = useState(ticket.admin_notes ?? '');
  const [saving, setSaving] = useState(false);

  async function handleUpdate(field: string, value: any) {
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase
        .from('tickets')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', ticket.id);
      router.refresh();
    } catch (err) {
      console.error(`Failed to update ${field}:`, err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Customer Context */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          Customer
        </h3>
        {customerContext ? (
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>{customerContext.name || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{customerContext.email}</span>
            </div>
            {customerContext.plan && (
              <div className="flex items-center gap-2 text-gray-600">
                <Tag className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>{customerContext.plan}</span>
              </div>
            )}
            {customerContext.siteUrl && (
              <div className="flex items-center gap-2 text-gray-600">
                <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <a href={customerContext.siteUrl} target="_blank" rel="noopener noreferrer"
                  className="text-admin-600 hover:text-admin-700 truncate">
                  {customerContext.siteUrl}
                </a>
              </div>
            )}
            {customerContext.siteStatus && (
              <div className="flex items-center gap-2 text-gray-600">
                <CircleDot className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Site: {customerContext.siteStatus}</span>
              </div>
            )}
            {customerContext.onboardingStage && (
              <div className="flex items-center gap-2 text-gray-600">
                <Layers className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Onboarding: {customerContext.onboardingStage}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>Member since {formatDate(customerContext.memberSince)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Ticket className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>{customerContext.totalTickets} total ticket{customerContext.totalTickets !== 1 ? 's' : ''}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 text-sm">
            {ticket.contact_name && (
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>{ticket.contact_name}</span>
              </div>
            )}
            {ticket.contact_email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{ticket.contact_email}</span>
              </div>
            )}
            {!ticket.contact_name && !ticket.contact_email && (
              <p className="text-gray-400 text-sm">No customer info available.</p>
            )}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="card p-5">
        <label className="block text-sm font-semibold text-gray-900 mb-2">Status</label>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            handleUpdate('status', e.target.value);
          }}
          className="input w-full"
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>
              {s.replace('-', ' ').replace(/^\w/, c => c.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      {/* Priority */}
      <div className="card p-5">
        <label className="block text-sm font-semibold text-gray-900 mb-2">Priority</label>
        <select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            handleUpdate('priority', e.target.value);
          }}
          className="input w-full"
        >
          {PRIORITIES.map(p => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Quote Amount (studio only) */}
      {ticket.type === 'studio' && (
        <div className="card p-5">
          <label className="block text-sm font-semibold text-gray-900 mb-2">Quote Amount</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="input w-full pl-7"
              />
            </div>
            <button
              onClick={() => handleUpdate('quote_amount', parseFloat(quoteAmount) || null)}
              disabled={saving}
              className="btn-admin text-sm py-2 px-3 inline-flex items-center gap-1"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Admin Notes */}
      <div className="card p-5">
        <label className="block text-sm font-semibold text-gray-900 mb-2">Admin Notes</label>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={3}
          placeholder="Internal notes..."
          className="input w-full resize-none mb-2"
        />
        <button
          onClick={() => handleUpdate('admin_notes', adminNotes)}
          disabled={saving}
          className="btn-admin text-sm py-1.5 px-3 inline-flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Notes
        </button>
      </div>
    </div>
  );
}
