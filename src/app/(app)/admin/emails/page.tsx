'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Send, Loader2, CheckCircle, ExternalLink } from 'lucide-react';

const EMAIL_TEMPLATES = [
  { key: 'welcome', name: 'Welcome Email', trigger: 'After first payment', description: 'Sent when a new customer signs up and pays. Includes plan name and dashboard link.' },
  { key: 'site_ready', name: 'Site Ready', trigger: 'After wp.cloud provisioning', description: 'Sent when the WordPress site is live. Includes site URL and WP Admin link.' },
  { key: 'domain_registered', name: 'Domain Registered', trigger: 'After OpenSRS registration', description: 'Sent when a domain is registered. Shows WHOIS privacy and auto-renew status.' },
  { key: 'invoice_paid', name: 'Invoice Receipt', trigger: 'After Stripe invoice.paid', description: 'Payment receipt with amount, description, and invoice link.' },
  { key: 'domain_expiry', name: 'Domain Expiry Warning', trigger: 'Daily health check (30/14/7/1 days)', description: 'Warns customer their domain is expiring. Shows auto-renew status.' },
  { key: 'provisioning_failed', name: 'Provisioning Failed', trigger: 'When wp.cloud site creation fails', description: 'Notifies customer of setup issue and directs to support.' },
];

export default function AdminEmailsPage() {
  const [sending, setSending] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [testEmail, setTestEmail] = useState('');

  async function sendTest(templateKey: string) {
    setSending(templateKey);
    setResults(prev => ({ ...prev, [templateKey]: { ok: false, message: '' } }));

    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: templateKey, to: testEmail || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setResults(prev => ({ ...prev, [templateKey]: { ok: true, message: `Sent to ${data.to}` } }));
      } else {
        setResults(prev => ({ ...prev, [templateKey]: { ok: false, message: data.error ?? 'Failed' } }));
      }
    } catch {
      setResults(prev => ({ ...prev, [templateKey]: { ok: false, message: 'Connection error' } }));
    }
    setSending(null);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Email Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">View and test all transactional email templates.</p>
        </div>
        <a
          href="https://resend.com/emails"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5"
        >
          <ExternalLink className="w-4 h-4" />
          Resend Dashboard
        </a>
      </div>

      {/* Test email input */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-3">
          <Mail className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="Send tests to... (leave blank for your admin email)"
            className="input flex-1"
          />
        </div>
      </div>

      {/* Templates */}
      <div className="space-y-3">
        {EMAIL_TEMPLATES.map(tmpl => {
          const result = results[tmpl.key];
          return (
            <div key={tmpl.key} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900">{tmpl.name}</h3>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tmpl.trigger}</span>
                  </div>
                  <p className="text-xs text-gray-500">{tmpl.description}</p>
                  {result && (
                    <p className={`text-xs mt-2 ${result.ok ? 'text-green-600' : 'text-red-600'}`}>
                      {result.ok && <CheckCircle className="w-3 h-3 inline mr-1" />}
                      {result.message}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => sendTest(tmpl.key)}
                  disabled={sending === tmpl.key}
                  className="btn-admin text-xs py-1.5 px-3 inline-flex items-center gap-1.5 shrink-0"
                >
                  {sending === tmpl.key ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-3 h-3" /> Send Test</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500">
          Templates are defined in <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">supabase/functions/_shared/email.ts</code>.
          Edit the code and redeploy Edge Functions to update. View delivery logs in the <a href="https://resend.com/emails" target="_blank" rel="noopener noreferrer" className="text-admin-600 hover:underline">Resend dashboard</a>.
        </p>
      </div>
    </div>
  );
}
