'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Calendar, ClipboardCheck } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', color: 'bg-gray-100 text-gray-600' },
  { value: 'scheduled', label: 'Call Scheduled', color: 'bg-blue-50 text-blue-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-amber-50 text-amber-700' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-50 text-emerald-700' },
];

export function OnboardingControls({ ticketId, currentStatus, onboardingType, callDate, notes }: {
  ticketId: string;
  currentStatus: string;
  onboardingType: string;
  callDate: string | null;
  notes: string | null;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [date, setDate] = useState(callDate ?? '');
  const [adminNotes, setAdminNotes] = useState(notes ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');

    const supabase = createClient();
    const { error: err } = await supabase
      .from('tickets')
      .update({
        metadata: {
          onboarding_status: status,
          onboarding_type: onboardingType,
          onboarding_call_date: date || null,
          onboarding_notes: adminNotes || null,
        },
        // Close ticket when onboarding is completed
        ...(status === 'completed' ? { status: 'closed' } : {}),
      })
      .eq('id', ticketId);

    if (err) {
      setError(err.message);
    } else {
      setSuccess('Onboarding updated');
      setTimeout(() => setSuccess(''), 3000);
      router.refresh();
    }
    setSaving(false);
  }

  const statusOption = STATUS_OPTIONS.find(s => s.value === status);
  const typeLabel = onboardingType === 'guided' ? 'Customer wants an onboarding call' : 'Customer chose self-guided setup';

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <ClipboardCheck className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900">Onboarding</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusOption?.color ?? ''}`}>
          {statusOption?.label}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4">{typeLabel}</p>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 mb-4">{success}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="label">Onboarding Status</label>
          <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        {onboardingType === 'guided' && (
          <div>
            <label className="label flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Call Date
            </label>
            <input
              type="datetime-local"
              className="input"
              value={date ? date.slice(0, 16) : ''}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="label">Admin Notes</label>
        <textarea
          className="input"
          rows={3}
          placeholder="Internal notes about this onboarding..."
          value={adminNotes}
          onChange={e => setAdminNotes(e.target.value)}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-admin text-sm inline-flex items-center gap-1.5"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Save
      </button>
    </div>
  );
}
