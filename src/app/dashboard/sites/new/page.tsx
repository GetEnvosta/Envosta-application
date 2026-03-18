'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const regions = [
  { value: 'us-east-1', label: 'US East (Virginia)' },
  { value: 'us-west-1', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'Europe (London)' },
  { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
  { value: 'ap-southeast-1', label: 'Asia (Singapore)' },
];

export default function NewSitePage() {
  const [label, setLabel] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data, error: err } = await supabase.functions.invoke('provision-hosting', {
      body: { label, region },
    });

    if (err || data?.error) {
      setError(data?.error ?? err?.message ?? 'Provisioning failed');
      setLoading(false);
      return;
    }

    router.push('/dashboard/sites');
    router.refresh();
  }

  return (
    <div>
      <Link href="/dashboard/sites" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to sites
      </Link>

      <h1 className="text-xl font-semibold text-gray-900 mb-1">Create a new site</h1>
      <p className="text-sm text-gray-500 mb-6">Your WordPress site will be provisioned on WP.cloud infrastructure.</p>

      <div className="card p-6 max-w-lg">
        <form onSubmit={handleCreate} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="label">Site name</label>
            <input type="text" className="input" value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="My Awesome Blog" required />
            <p className="text-xs text-gray-400 mt-1.5">A friendly name for your site (you can change this later)</p>
          </div>

          <div>
            <label className="label">Server region</label>
            <select className="input" value={region} onChange={e => setRegion(e.target.value)}>
              {regions.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1.5">Choose the region closest to your audience</p>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Provisioning…</>
            ) : (
              'Create site'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
