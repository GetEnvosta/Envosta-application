import { Mail, Settings, Send, Check, ExternalLink, LifeBuoy } from 'lucide-react';
import Link from 'next/link';

const steps = [
  {
    icon: Mail,
    title: 'Choose a provider',
    description:
      'We recommend Google Workspace for professional email. It integrates seamlessly with your domain and gives you access to the full Google productivity suite.',
  },
  {
    icon: Settings,
    title: 'Add DNS records',
    description:
      'Head to the Domains tab and add the MX records provided by your email provider. This tells the internet where to deliver mail for your domain.',
  },
  {
    icon: Send,
    title: 'Start sending',
    description:
      'Once DNS records propagate (usually under an hour), your new professional email address is live. Send and receive from you@yourdomain.com.',
  },
];

const features = [
  'Custom email @yourdomain.com',
  '30 GB cloud storage per user',
  'Google Docs, Sheets & Slides',
  'Google Meet video conferencing',
  'Admin console & security controls',
];

export default function EmailPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Business Email</h1>
      <p className="text-sm text-gray-500 mb-8">
        Get a professional email address like you@yourdomain.com
      </p>

      {/* How It Works */}
      <h2 className="text-sm font-semibold text-gray-900 mb-3">How It Works</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {steps.map((step, i) => (
          <div key={i} className="card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-50 text-brand-600">
                <step.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider">
                Step {i + 1}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">{step.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>

      {/* Recommended Provider */}
      <h2 className="text-sm font-semibold text-gray-900 mb-3">Recommended Provider</h2>
      <div className="card p-6 mb-10 max-w-xl">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-base font-semibold text-gray-900">Google Workspace</h3>
          <span className="badge-blue">Recommended</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Business Starter &mdash; $7.20 USD/user/month
        </p>
        <ul className="space-y-2 mb-5">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
        <a
          href="https://workspace.google.com/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex"
        >
          Get Google Workspace <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Need help callout */}
      <div className="card p-5 bg-gray-50 border-gray-200 flex items-start gap-3 max-w-xl">
        <LifeBuoy className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-gray-900">Need help?</p>
          <p className="text-sm text-gray-500 mt-0.5">
            If you need help configuring your email DNS records,{' '}
            <Link href="/dashboard/support" className="text-brand-600 font-medium hover:underline">
              submit a support request
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
