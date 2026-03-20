'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (data) {
        setProfile(data);
        setFullName(data.full_name ?? '');
        setCompany(data.company_name ?? '');
        setPhone(data.phone ?? '');
        setTimezone(data.timezone ?? 'UTC');
      }
      setLoading(false);
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('users').update({
      full_name: fullName, company_name: company, phone, timezone,
    }).eq('id', user!.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <div className="text-sm text-gray-400 py-12 text-center">Loading…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-6">Update your profile and account preferences</p>

      <div className="card p-6 max-w-lg">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="label">Full name</label>
            <input type="text" className="input" value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label">Company</label>
            <input type="text" className="input" value={company} onChange={e => setCompany(e.target.value)}
              placeholder="Optional" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input type="tel" className="input" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="Optional" />
          </div>
          <div>
            <label className="label">Timezone</label>
            <select className="input" value={timezone} onChange={e => setTimezone(e.target.value)}>
              {Intl.supportedValuesOf('timeZone').map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save changes'}
            </button>
            {saved && <span className="text-sm text-emerald-600">Saved</span>}
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Email: <span className="font-medium text-gray-700">{profile?.email}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">To change your email, contact support.</p>
        </div>
      </div>
    </div>
  );
}
