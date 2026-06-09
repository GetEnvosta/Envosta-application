'use client';

/**
 * Enterprise / sales inquiry form. POSTs to /api/contact with
 * type='enterprise' so the existing handler creates a ticket in
 * /admin/tickets + emails sales@envosta.com.
 *
 * Enterprise is custom-priced and manually onboarded — there is NO
 * self-serve checkout for it. This form captures the lead; the team
 * follows up, creates the account, and assigns the plan by hand.
 *
 * Styled to the dark marketing design system (tokens in marketing.css).
 */
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const TRAFFIC_OPTIONS = [
  'Just getting started',
  'Under 50k visits/mo',
  '50k–250k visits/mo',
  '250k–1M visits/mo',
  '1M+ visits/mo',
];

export function SalesInquiryForm() {
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
    const company = String(data.get('company') ?? '').trim();
    const website = String(data.get('website') ?? '').trim();
    const traffic = String(data.get('traffic') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();

    if (!email || !name) {
      setError('Name and email are required.');
      setSubmitting(false);
      return;
    }

    // Give sales everything they need to scope a tailored plan.
    const composed = [
      `Company: ${company || '(not provided)'}`,
      `Website: ${website || '(not provided)'}`,
      `Expected traffic: ${traffic || '(not specified)'}`,
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
          subject: `Enterprise inquiry: ${company || name}`,
          message: composed,
          type: 'enterprise',
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
      .sif{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:24px;padding:40px 36px}
      .sif-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
      .sif-group{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
      .sif-group:last-of-type{margin-bottom:0}
      .sif label{font-size:.76rem;font-weight:500;color:var(--t2)}
      .sif label .req{color:var(--gold-bright)}
      .sif input,.sif select,.sif textarea{background:var(--bg);border:1px solid var(--bdr2);border-radius:10px;padding:12px 16px;color:var(--t1);font-size:.88rem;font-family:inherit;outline:none;transition:border-color .2s;width:100%}
      .sif input::placeholder,.sif textarea::placeholder{color:var(--t3)}
      .sif input:focus,.sif select:focus,.sif textarea:focus{border-color:var(--gold)}
      .sif select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236a7a94' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center}
      .sif select option{background:#0b1220;color:var(--t1)}
      .sif textarea{resize:vertical;min-height:120px}
      .sif-submit{width:100%;justify-content:center;margin-top:24px;padding:14px 24px;font-size:.92rem}
      .sif-submit[disabled]{opacity:.6;cursor:not-allowed}
      .sif-note{font-size:.72rem;color:var(--t3);text-align:center;margin-top:14px;font-weight:300}
      .sif-error{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:10px;padding:10px 14px;font-size:.84rem;color:#fca5a5;margin-top:16px}
      .sif-success{background:linear-gradient(180deg,rgba(34,197,94,.06),rgba(255,255,255,.01));border:1px solid rgba(34,197,94,.22);border-radius:24px;padding:48px 40px;text-align:center}
      .sif-success h3{font-size:1.15rem;font-weight:500;color:var(--t1);margin-bottom:8px}
      .sif-success p{font-size:.88rem;color:var(--t2);line-height:1.7;font-weight:300}
      .sif-success a{color:var(--gold-bright);text-decoration:none}
      .sif-success a:hover{text-decoration:underline}
      @media(max-width:640px){.sif-row{grid-template-columns:1fr}}
    `}</style>
  );

  if (submitted) {
    return (
      <>
        {styleBlock}
        <div className="sif-success">
          <h3>Thanks — we&apos;ll be in touch</h3>
          <p>
            A member of our team will reach out within one business day to scope your plan and get
            you set up. If you don&apos;t hear back, email{' '}
            <a href="mailto:sales@envosta.com">sales@envosta.com</a>.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {styleBlock}
      <form onSubmit={onSubmit} className="sif">
        <div className="sif-row">
          <Field label="Your name" name="name" required autoComplete="name" />
          <Field label="Work email" name="email" type="email" required autoComplete="email" />
        </div>

        <div className="sif-row">
          <Field label="Company" name="company" autoComplete="organization" />
          <Field label="Current website (optional)" name="website" placeholder="example.com" />
        </div>

        <div className="sif-group">
          <label htmlFor="traffic">Expected monthly traffic</label>
          <select id="traffic" name="traffic" defaultValue="">
            <option value="" disabled>Select a range…</option>
            {TRAFFIC_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <div className="sif-group">
          <label htmlFor="message">What are you looking to build? (optional)</label>
          <textarea
            id="message"
            name="message"
            rows={4}
            maxLength={5000}
            placeholder="Number of sites, migration timeline, compliance needs, support expectations, etc."
          />
        </div>

        {error && <div className="sif-error">{error}</div>}

        <button type="submit" disabled={submitting} className="bp sif-submit">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {submitting ? 'Sending…' : 'Send inquiry'}
        </button>

        <p className="sif-note">
          We&apos;ll never share your details. Inquiries are stored as tickets in our admin.
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
    <div className="sif-group" style={{ marginBottom: 0 }}>
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
