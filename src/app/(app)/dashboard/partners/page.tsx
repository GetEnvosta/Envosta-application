'use client';

import { useState } from 'react';
import { CheckCircle, Handshake, Building2, Gift } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Shared success state                                               */
/* ------------------------------------------------------------------ */
function SuccessState({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-6">
      <CheckCircle className="w-10 h-10 text-emerald-500 mb-3" />
      <p className="text-sm font-medium text-gray-900 mb-1">{message}</p>
      <button onClick={onReset} className="text-sm text-brand-600 font-medium hover:underline mt-2">
        Submit Another
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sales Partner Card                                                 */
/* ------------------------------------------------------------------ */
function SalesPartnerCard() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', company: '', referralPlan: '',
  });

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  function reset() {
    setForm({ fullName: '', email: '', phone: '', company: '', referralPlan: '' });
    setSubmitted(false);
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-50 text-brand-600">
          <Handshake className="w-5 h-5" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">Sales Partner</h2>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Refer businesses to Envosta and earn recurring commissions on every sale. Perfect for consultants, freelancers, and agencies.
      </p>

      {submitted ? (
        <SuccessState message="Application submitted! We'll review within 48 hours." onReset={reset} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input type="text" className="input" required value={form.fullName} onChange={set('fullName')} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" required value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input type="tel" className="input" required value={form.phone} onChange={set('phone')} />
          </div>
          <div>
            <label className="label">Company Name <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" className="input" value={form.company} onChange={set('company')} />
          </div>
          <div>
            <label className="label">How do you plan to refer?</label>
            <textarea className="input" rows={3} required value={form.referralPlan} onChange={set('referralPlan')} placeholder="Tell us about your audience or referral strategy..." />
          </div>
          <button type="submit" className="btn-primary">Submit Application</button>
        </form>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Agency Partner Card                                                */
/* ------------------------------------------------------------------ */
function AgencyPartnerCard() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', agencyName: '', website: '', siteCount: '',
  });

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  function reset() {
    setForm({ fullName: '', email: '', phone: '', agencyName: '', website: '', siteCount: '' });
    setSubmitted(false);
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-50 text-brand-600">
          <Building2 className="w-5 h-5" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">Agency Partner</h2>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Build client sites on the Envosta platform. Get priority support, co-marketing opportunities, and volume discounts.
      </p>

      {submitted ? (
        <SuccessState message="Application submitted! We'll review within 48 hours." onReset={reset} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input type="text" className="input" required value={form.fullName} onChange={set('fullName')} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" required value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input type="tel" className="input" required value={form.phone} onChange={set('phone')} />
          </div>
          <div>
            <label className="label">Agency Name</label>
            <input type="text" className="input" required value={form.agencyName} onChange={set('agencyName')} />
          </div>
          <div>
            <label className="label">Website URL</label>
            <input type="url" className="input" required value={form.website} onChange={set('website')} placeholder="https://" />
          </div>
          <div>
            <label className="label">How many sites do you plan to build?</label>
            <select className="input" required value={form.siteCount} onChange={set('siteCount')}>
              <option value="" disabled>Select a range</option>
              <option value="1-5">1 - 5</option>
              <option value="6-20">6 - 20</option>
              <option value="21-50">21 - 50</option>
              <option value="50+">50+</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">Submit Application</button>
        </form>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Referral Program Card                                              */
/* ------------------------------------------------------------------ */
function ReferralProgramCard() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    yourName: '', yourEmail: '', friendName: '', friendEmail: '', personalMessage: '',
  });

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  function reset() {
    setForm({ yourName: '', yourEmail: '', friendName: '', friendEmail: '', personalMessage: '' });
    setSubmitted(false);
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-50 text-brand-600">
          <Gift className="w-5 h-5" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">Referral Program</h2>
        <span className="badge-green">6 months free</span>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Share Envosta with a friend and you both get 6 months free when they sign up. It is that simple.
      </p>

      {submitted ? (
        <SuccessState message="Application submitted! We'll review within 48 hours." onReset={reset} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Your Name</label>
            <input type="text" className="input" required value={form.yourName} onChange={set('yourName')} />
          </div>
          <div>
            <label className="label">Your Email</label>
            <input type="email" className="input" required value={form.yourEmail} onChange={set('yourEmail')} />
          </div>
          <div>
            <label className="label">Friend&apos;s Name</label>
            <input type="text" className="input" required value={form.friendName} onChange={set('friendName')} />
          </div>
          <div>
            <label className="label">Friend&apos;s Email</label>
            <input type="email" className="input" required value={form.friendEmail} onChange={set('friendEmail')} />
          </div>
          <div>
            <label className="label">Personal message <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea className="input" rows={3} value={form.personalMessage} onChange={set('personalMessage')} placeholder="Add a note for your friend..." />
          </div>
          <button type="submit" className="btn-primary">Send Referral</button>
        </form>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function PartnersPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Partner with Envosta</h1>
      <p className="text-sm text-gray-500 mb-8">Join our partner program and grow with us.</p>

      <div className="space-y-6 max-w-2xl">
        <SalesPartnerCard />
        <AgencyPartnerCard />
        <ReferralProgramCard />
      </div>
    </div>
  );
}
