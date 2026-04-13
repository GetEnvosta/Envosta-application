'use client';

import { useState } from 'react';
import { ArrowRight, SkipForward } from 'lucide-react';

const INDUSTRIES = [
  'Restaurant / Food Service', 'Retail / E-commerce', 'Healthcare / Medical',
  'Real Estate', 'Professional Services', 'Construction / Trades',
  'Fitness / Wellness', 'Beauty / Salon', 'Automotive', 'Non-Profit',
  'Education', 'Technology', 'Creative / Agency', 'Legal', 'Finance', 'Other',
];

export function StepBusiness({
  businessInfo,
  selectedBriefText,
  onSave,
  onSkip,
}: {
  businessInfo: any;
  selectedBriefText: string;
  onSave: (info: any) => void;
  onSkip: () => void;
}) {
  const [form, setForm] = useState({
    businessName: businessInfo.businessName || '',
    industry: businessInfo.industry || '',
    tagline: businessInfo.tagline || '',
    phone: businessInfo.phone || '',
    email: businessInfo.email || '',
    address: businessInfo.address || '',
    targetAudience: businessInfo.targetAudience || '',
    primaryColor: businessInfo.primaryColor || '',
    accentColor: businessInfo.accentColor || '',
    logoNotes: businessInfo.logoNotes || '',
    referenceSites: businessInfo.referenceSites || '',
  });

  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));
  }

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors';

  return (
    <div className="flex items-start justify-center min-h-full p-8">
      <div className="max-w-2xl w-full">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Business Details</h2>
        <p className="text-sm text-gray-500 mb-6">Help the AI create more accurate content. Fill in what you know — you can skip this step entirely.</p>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Business Name</label>
              <input type="text" value={form.businessName} onChange={set('businessName')} className={inputClass} placeholder="Acme Plumbing" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Industry</label>
              <select value={form.industry} onChange={set('industry')} className={inputClass}>
                <option value="">Select...</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tagline / Slogan</label>
            <input type="text" value={form.tagline} onChange={set('tagline')} className={inputClass} placeholder="Calgary's most trusted plumber since 2005" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={set('phone')} className={inputClass} placeholder="(403) 555-1234" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={set('email')} className={inputClass} placeholder="info@acme.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
              <input type="text" value={form.address} onChange={set('address')} className={inputClass} placeholder="123 Main St, Calgary" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Target Audience</label>
            <input type="text" value={form.targetAudience} onChange={set('targetAudience')} className={inputClass} placeholder="Homeowners in Calgary who need reliable plumbing services" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Brand Primary Color (optional)</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primaryColor || '#1a1a2e'} onChange={set('primaryColor')} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                <input type="text" value={form.primaryColor} onChange={set('primaryColor')} className={inputClass} placeholder="#1a1a2e" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Accent / CTA Color (optional)</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.accentColor || '#e94560'} onChange={set('accentColor')} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                <input type="text" value={form.accentColor} onChange={set('accentColor')} className={inputClass} placeholder="#e94560" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Logo Notes</label>
            <input type="text" value={form.logoNotes} onChange={set('logoNotes')} className={inputClass} placeholder="Blue and white text logo, no icon yet" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reference Sites (sites you like the look of)</label>
            <input type="text" value={form.referenceSites} onChange={set('referenceSites')} className={inputClass} placeholder="https://example.com, https://competitor.com" />
          </div>
        </div>

        <div className="flex items-center justify-between mt-8">
          <button onClick={onSkip} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <SkipForward className="w-3.5 h-3.5" /> Skip this step
          </button>
          <button
            onClick={() => onSave(form)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
