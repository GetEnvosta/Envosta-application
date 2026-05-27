'use client';

/**
 * Reseller lead form — agency-focused intake. POSTs to /api/contact with
 * type='reseller' so the existing contact handler creates a ticket +
 * emails sales@envosta.com. Adds reseller-specific fields (agency name,
 * site count, current host) into the message body.
 */
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const SITE_COUNT_OPTIONS = ['1–5', '6–15', '16–30', '31–75', '75+'];

export function ResellerLeadForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const agencyName = String(data.get('agencyName') ?? '').trim();
    const siteCount = String(data.get('siteCount') ?? '').trim();
    const currentHost = String(data.get('currentHost') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();

    if (!email || !name) {
      setError('Name and email are required.');
      setSubmitting(false);
      return;
    }

    // Build a message body that gives sales everything they need to respond.
    const composed = [
      `Agency: ${agencyName || '(not provided)'}`,
      `Sites to host: ${siteCount || '(not specified)'}`,
      `Current host: ${currentHost || '(not specified)'}`,
      '',
      message || '(no additional notes)',
    ].join('\n');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          subject: `Reseller inquiry: ${agencyName || name} (${siteCount || '?'} sites)`,
          message: composed,
          type: 'reseller',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? 'Submission failed. Try again or email us directly.');
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Network error. Try again or email us directly.');
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-8 text-center">
        <h3 className="text-lg font-semibold text-emerald-900 mb-1">Thanks — we&apos;ll be in touch</h3>
        <p className="text-sm text-emerald-700">
          Expect a reply within one business day. If you don&apos;t hear back, email{' '}
          <a href="mailto:sales@envosta.com" className="underline">sales@envosta.com</a>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Your name" name="name" required autoComplete="name" />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
      </div>
      <Field label="Agency name" name="agencyName" autoComplete="organization" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="siteCount" className="block text-xs font-medium text-gray-700 mb-1.5">
            How many sites do you need to host?
          </label>
          <select
            id="siteCount"
            name="siteCount"
            className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
            defaultValue=""
          >
            <option value="" disabled>Select a range…</option>
            {SITE_COUNT_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <Field label="Current host (optional)" name="currentHost" placeholder="e.g. WP Engine, Bluehost" />
      </div>

      <div>
        <label htmlFor="message" className="block text-xs font-medium text-gray-700 mb-1.5">
          Anything else we should know? (optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          maxLength={5000}
          placeholder="Migration timeline, traffic patterns, support expectations, etc."
          className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 resize-y"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-3 rounded-lg transition-colors"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {submitting ? 'Sending…' : 'Send inquiry'}
      </button>

      <p className="text-[11px] text-gray-400 text-center pt-1">
        We&apos;ll never share your details. Inquiries are stored as support tickets in our admin.
      </p>
    </form>
  );
}

function Field({
  label, name, type = 'text', required, autoComplete, placeholder,
}: {
  label: string; name: string; type?: string; required?: boolean; autoComplete?: string; placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
      />
    </div>
  );
}
