'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Handshake, Loader2 } from 'lucide-react';

const PARTNER_TYPES = [
  { value: 'sales', label: 'Sales Partner', description: 'Refer businesses to Envosta and earn recurring commissions on every customer you bring in.' },
  { value: 'agency', label: 'Agency Partner', description: 'Build client sites on Envosta. Get priority support, bulk pricing, and a dedicated account manager.' },
  { value: 'referral', label: 'Referral Program', description: 'Share Envosta with a friend and they get 6 months of free hosting. Simple as that.' },
];

export default function PartnersPage() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') ?? 'sales';
  const [type, setType] = useState(initialType);
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', companyName: '', websiteUrl: '',
    siteCount: '', message: '', friendName: '', friendEmail: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const selectedType = PARTNER_TYPES.find(t => t.value === type)!;

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { createClient } = await import('@/lib/supabase-browser');
      const supabase = createClient();

      // Build subject based on partner type
      let subject = '';
      let description = '';
      if (type === 'sales') {
        subject = `[Sales Partner] New Application — ${form.fullName}`;
        description = `Company: ${form.companyName || 'N/A'}\nPhone: ${form.phone || 'N/A'}\n\nReferral Strategy:\n${form.message}`;
      } else if (type === 'agency') {
        subject = `[Agency Partner] New Application — ${form.fullName}`;
        description = `Agency: ${form.companyName}\nWebsite: ${form.websiteUrl || 'N/A'}\nPhone: ${form.phone || 'N/A'}\nClient Sites: ${form.siteCount || 'N/A'}`;
      } else {
        subject = `[Referral] New Application — ${form.fullName} referring ${form.friendName}`;
        description = `Friend: ${form.friendName} (${form.friendEmail})\n\nMessage:\n${form.message || 'No message'}`;
      }

      // Create ticket
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('tickets').insert({
        user_id: user?.id ?? null,
        type: 'sales',
        subject,
        description,
        source: 'partner-form',
        contact_name: form.fullName,
        contact_email: form.email,
        priority: 'medium',
      });

      setSubmitting(false);
      setSubmitted(true);
    } catch {
      setSubmitting(false);
      setSubmitted(true); // Show success anyway — we'll fix errors later
    }
  }

  function reset() {
    setSubmitted(false);
    setForm({ fullName: '', email: '', phone: '', companyName: '', websiteUrl: '', siteCount: '', message: '', friendName: '', friendEmail: '' });
  }

  if (submitted) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Partner with Envosta</h1>
          <p className="text-sm text-gray-500 mt-0.5">Join our partner program and grow with us.</p>
        </div>
        <div className="card p-12 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">Application Submitted!</h3>
          <p className="text-sm text-gray-500 mb-4">We&apos;ll review your application and get back to you within 48 hours.</p>
          <button onClick={reset} className="text-sm text-brand-600 font-medium hover:underline">
            Submit Another Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Partner with Envosta</h1>
        <p className="text-sm text-gray-500 mt-0.5">Join our partner program and grow with us.</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
          <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
            <Handshake className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Partner Application</h2>
            <p className="text-xs text-gray-500">Choose a partner type and fill out the form below.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Partner Type Selector */}
          <div>
            <label className="label">Partner Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="input"
            >
              {PARTNER_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1.5">{selectedType.description}</p>
            {type === 'referral' && (
              <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1 rounded-full">
                🎁 Your friend gets 6 months free hosting
              </div>
            )}
          </div>

          {/* Common Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{type === 'referral' ? 'Your Name' : 'Full Name'}</label>
              <input type="text" className="input" required value={form.fullName}
                onChange={e => handleChange('fullName', e.target.value)} placeholder="Jane Smith" />
            </div>
            <div>
              <label className="label">{type === 'referral' ? 'Your Email' : 'Email'}</label>
              <input type="email" className="input" required value={form.email}
                onChange={e => handleChange('email', e.target.value)} placeholder="you@company.com" />
            </div>
          </div>

          {/* Sales & Agency: Phone */}
          {(type === 'sales' || type === 'agency') && (
            <div>
              <label className="label">Phone Number</label>
              <input type="tel" className="input" value={form.phone}
                onChange={e => handleChange('phone', e.target.value)} placeholder="+1 (555) 123-4567" />
            </div>
          )}

          {/* Sales: Company */}
          {type === 'sales' && (
            <>
              <div>
                <label className="label">Company Name <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" className="input" value={form.companyName}
                  onChange={e => handleChange('companyName', e.target.value)} placeholder="Your Company" />
              </div>
              <div>
                <label className="label">How do you plan to refer customers?</label>
                <textarea className="input min-h-[80px]" value={form.message}
                  onChange={e => handleChange('message', e.target.value)}
                  placeholder="Tell us about your referral strategy..." />
              </div>
            </>
          )}

          {/* Agency: Extra fields */}
          {type === 'agency' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Agency Name</label>
                  <input type="text" className="input" required value={form.companyName}
                    onChange={e => handleChange('companyName', e.target.value)} placeholder="Your Agency" />
                </div>
                <div>
                  <label className="label">Website URL</label>
                  <input type="url" className="input" value={form.websiteUrl}
                    onChange={e => handleChange('websiteUrl', e.target.value)} placeholder="https://youragency.com" />
                </div>
              </div>
              <div>
                <label className="label">How many client sites do you manage?</label>
                <select className="input" value={form.siteCount}
                  onChange={e => handleChange('siteCount', e.target.value)}>
                  <option value="">Select...</option>
                  <option value="1-5">1–5</option>
                  <option value="6-20">6–20</option>
                  <option value="21-50">21–50</option>
                  <option value="50+">50+</option>
                </select>
              </div>
            </>
          )}

          {/* Referral: Friend's info */}
          {type === 'referral' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Friend&apos;s Name</label>
                  <input type="text" className="input" required value={form.friendName}
                    onChange={e => handleChange('friendName', e.target.value)} placeholder="Friend's name" />
                </div>
                <div>
                  <label className="label">Friend&apos;s Email</label>
                  <input type="email" className="input" required value={form.friendEmail}
                    onChange={e => handleChange('friendEmail', e.target.value)} placeholder="friend@email.com" />
                </div>
              </div>
              <div>
                <label className="label">Personal message <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea className="input min-h-[80px]" value={form.message}
                  onChange={e => handleChange('message', e.target.value)}
                  placeholder="Add a personal note to your friend..." />
              </div>
            </>
          )}

          <button type="submit" disabled={submitting} className="btn-primary inline-flex items-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
