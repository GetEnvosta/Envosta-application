'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { CheckCircle, Upload, ExternalLink, Loader2, Paintbrush, DollarSign } from 'lucide-react';

export default function SupportPage() {
  const [department, setDepartment] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('medium');
  const [submitted, setSubmitted] = useState(false);
  const [studioLoading, setStudioLoading] = useState(false);
  const [studioError, setStudioError] = useState('');

  const isStudio = department === 'studio';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isStudio) {
      // Studio Request — redirect to Stripe checkout for $250
      setStudioLoading(true);
      setStudioError('');

      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setStudioError('Please log in first'); setStudioLoading(false); return; }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-checkout`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({
              studioRequest: true,
              studioSubject: subject,
              studioMessage: message,
            }),
          }
        );

        const data = await res.json();

        if (!res.ok || !data?.url) {
          setStudioError(data?.error ?? 'Checkout failed');
          setStudioLoading(false);
          return;
        }

        window.location.href = data.url;
      } catch (err) {
        setStudioError(String(err));
        setStudioLoading(false);
      }
      return;
    }

    // Regular support — placeholder
    setSubmitted(true);
    setSubject('');
    setMessage('');
    setPriority('medium');
    setDepartment('general');
    setTimeout(() => setSubmitted(false), 6000);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Support</h1>
      <p className="text-sm text-gray-500 mb-8">Get help from the Envosta team</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submit a Request */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Submit a Request</h2>

            {submitted && (
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-5">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-800">
                  Your request has been submitted. We typically respond within 24 hours.
                </p>
              </div>
            )}

            {studioError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5">
                <p className="text-sm text-red-700">{studioError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Department</label>
                <select
                  className="input"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="general">General Support</option>
                  <option value="billing">Billing</option>
                  <option value="technical">Technical Support</option>
                  <option value="studio">Studio Request — $250 CAD</option>
                </select>
              </div>

              {/* Studio Request info banner */}
              {isStudio && (
                <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-5">
                  <div className="flex items-start gap-3">
                    <Paintbrush className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-1">Studio Request — $250 CAD</p>
                      <p className="text-sm text-gray-600 leading-relaxed mb-3">
                        Our studio team will handle design changes, new pages, plugin setup, custom features, or content updates for your site. One request at a time, delivered within 3–5 business days.
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {['Design Changes', 'New Pages', 'Plugin Setup', 'Custom Features', 'Content Updates'].map(tag => (
                          <span key={tag} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{tag}</span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">You&apos;ll be redirected to Stripe to complete payment. Your request is submitted after payment.</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="label">{isStudio ? 'What do you need?' : 'Subject'}</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder={isStudio ? 'e.g. Redesign my homepage hero section' : 'Brief summary of your issue'}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="label">{isStudio ? 'Describe the request in detail' : 'Message'}</label>
                <textarea
                  className="input"
                  rows={isStudio ? 6 : 4}
                  required
                  placeholder={isStudio
                    ? 'Include as much detail as possible: what you want changed, reference links, brand colors, copy text, etc.'
                    : 'Describe your issue in detail...'}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              {!isStudio && (
                <>
                  <div>
                    <label className="label">Priority</label>
                    <select
                      className="input"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  {/* Attachment placeholder */}
                  <div>
                    <label className="label">Attachments</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer">
                      <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        Drag & drop files here, or{' '}
                        <span className="text-brand-600 font-medium">browse</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF up to 10 MB</p>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={studioLoading}
                className={isStudio ? 'btn-primary inline-flex items-center gap-2' : 'btn-primary'}
              >
                {isStudio ? (
                  studioLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to payment...</>
                  ) : (
                    <><DollarSign className="w-4 h-4" /> Pay $250 & Submit Request</>
                  )
                ) : (
                  'Submit Request'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Envosta Studio promo */}
        <div className="lg:col-span-1">
          <div className="relative rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-white to-blue-50/60 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Need a custom website?</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Our studio team designs and builds high-performance websites tailored to your brand. From concept to launch, we handle everything.
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="badge-indigo">Custom Design</span>
              <span className="badge-indigo">SEO Optimized</span>
              <span className="badge-indigo">Launch in 5 Days</span>
            </div>
            <a
              href="https://envosta.com/studio"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-1.5"
            >
              Learn More <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
