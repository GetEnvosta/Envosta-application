'use client';

import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

export function PartnerChangeRequest() {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!reason.trim()) {
      setError('Please provide a reason');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/partners/change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error ?? 'Failed to submit request');
      }
    } catch (e) {
      setError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-4">
        <p className="text-sm font-medium text-gray-900 mb-1">Change request submitted</p>
        <p className="text-xs text-gray-500">Envosta will review your request and get back to you.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        If you'd like to work with a different partner, submit a change request. Envosta will review it and help you find a new partner.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why would you like to change your partner?"
        rows={3}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none resize-none"
      />
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors"
        >
          {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
          Submit Change Request
        </button>
      </div>
    </div>
  );
}
