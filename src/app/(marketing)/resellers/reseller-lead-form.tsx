'use client';

/**
 * Reseller lead form — agency-focused intake. POSTs to /api/contact with
 * type='reseller' so the existing contact handler creates a ticket +
 * emails sales@envosta.com. Adds reseller-specific fields (agency name,
 * site count, current host) into the message body.
 *
 * Styled to the dark marketing design system (tokens defined in
 * marketing.css). Self-contained style block so the form looks correct
 * regardless of the page it's dropped into.
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

  const styleBlock = (
    <style>{`
      .rlf{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:24px;padding:40px 36px}
      .rlf-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
      .rlf-group{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
      .rlf-group:last-of-type{margin-bottom:0}
      .rlf label{font-size:.76rem;font-weight:500;color:var(--t2)}
      .rlf label .req{color:var(--gold-bright)}
      .rlf input,.rlf select,.rlf textarea{background:var(--bg);border:1px solid var(--bdr2);border-radius:10px;padding:12px 16px;color:var(--t1);font-size:.88rem;font-family:inherit;outline:none;transition:border-color .2s;width:100%}
      .rlf input::placeholder,.rlf textarea::placeholder{color:var(--t3)}
      .rlf input:focus,.rlf select:focus,.rlf textarea:focus{border-color:var(--gold)}
      .rlf select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236a7a94' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center}
      .rlf select option{background:#0b1220;color:var(--t1)}
      .rlf textarea{resize:vertical;min-height:120px}
      .rlf-submit{width:100%;justify-content:center;margin-top:24px;padding:14px 24px;font-size:.92rem}
      .rlf-submit[disabled]{opacity:.6;cursor:not-allowed}
      .rlf-note{font-size:.72rem;color:var(--t3);text-align:center;margin-top:14px;font-weight:300}
      .rlf-error{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:10px;padding:10px 14px;font-size:.84rem;color:#fca5a5;margin-top:16px}
      .rlf-success{background:linear-gradient(180deg,rgba(34,197,94,.06),rgba(255,255,255,.01));border:1px solid rgba(34,197,94,.22);border-radius:24px;padding:48px 40px;text-align:center}
      .rlf-success h3{font-size:1.15rem;font-weight:500;color:var(--t1);margin-bottom:8px}
      .rlf-success p{font-size:.88rem;color:var(--t2);line-height:1.7;font-weight:300}
      .rlf-success a{color:var(--gold-bright);text-decoration:none}
      .rlf-success a:hover{text-decoration:underline}
      @media(max-width:640px){.rlf-row{grid-template-columns:1fr}}
    `}</style>
  );

  if (submitted) {
    return (
      <>
        {styleBlock}
        <div className="rlf-success">
          <h3>Thanks — we&apos;ll be in touch</h3>
          <p>
            Expect a reply within one business day. If you don&apos;t hear back, email{' '}
            <a href="mailto:sales@envosta.com">sales@envosta.com</a>.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {styleBlock}
      <form onSubmit={onSubmit} className="rlf">
        <div className="rlf-row">
          <Field label="Your name" name="name" required autoComplete="name" />
          <Field label="Email" name="email" type="email" required autoComplete="email" />
        </div>

        <div className="rlf-group">
          <label htmlFor="agencyName">Agency name</label>
          <input id="agencyName" name="agencyName" type="text" autoComplete="organization" />
        </div>

        <div className="rlf-row">
          <div className="rlf-group" style={{ marginBottom: 0 }}>
            <label htmlFor="siteCount">How many sites do you need to host?</label>
            <select id="siteCount" name="siteCount" defaultValue="">
              <option value="" disabled>Select a range…</option>
              {SITE_COUNT_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <Field label="Current host (optional)" name="currentHost" placeholder="e.g. WP Engine, Bluehost" />
        </div>

        <div className="rlf-group">
          <label htmlFor="message">Anything else we should know? (optional)</label>
          <textarea
            id="message"
            name="message"
            rows={4}
            maxLength={5000}
            placeholder="Migration timeline, traffic patterns, support expectations, etc."
          />
        </div>

        {error && <div className="rlf-error">{error}</div>}

        <button type="submit" disabled={submitting} className="bp rlf-submit">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {submitting ? 'Sending…' : 'Send inquiry'}
        </button>

        <p className="rlf-note">
          We&apos;ll never share your details. Inquiries are stored as support tickets in our admin.
        </p>
      </form>
    </>
  );
}

function Field({
  label, name, type = 'text', required, autoComplete, placeholder,
}: {
  label: string; name: string; type?: string; required?: boolean; autoComplete?: string; placeholder?: string;
}) {
  return (
    <div className="rlf-group" style={{ marginBottom: 0 }}>
      <label htmlFor={name}>
        {label}{required && <span className="req"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
    </div>
  );
}
