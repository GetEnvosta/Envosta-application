'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { Loader2, RotateCcw, Save, Plus, X } from 'lucide-react';

const DEFAULT_NAMESERVERS = ['ns1.envosta.com', 'ns2.envosta.com'];

export function NameserverManager({ domainName, currentNameservers }: {
  domainName: string;
  currentNameservers: string[];
}) {
  const initial = currentNameservers.length > 0 ? currentNameservers : DEFAULT_NAMESERVERS;
  const [nameservers, setNameservers] = useState<string[]>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const isDefault = nameservers.length === 2
    && nameservers[0] === DEFAULT_NAMESERVERS[0]
    && nameservers[1] === DEFAULT_NAMESERVERS[1];

  function updateNs(index: number, value: string) {
    const updated = [...nameservers];
    updated[index] = value.toLowerCase().trim();
    setNameservers(updated);
    setSuccess('');
  }

  function addNs() {
    if (nameservers.length >= 6) return;
    setNameservers([...nameservers, '']);
    setSuccess('');
  }

  function removeNs(index: number) {
    if (nameservers.length <= 2) return;
    setNameservers(nameservers.filter((_, i) => i !== index));
    setSuccess('');
  }

  function resetToDefault() {
    setNameservers([...DEFAULT_NAMESERVERS]);
    setSuccess('');
    setError('');
  }

  async function handleSave() {
    // Validate
    const filtered = nameservers.filter(ns => ns.trim() !== '');
    if (filtered.length < 2) {
      setError('At least 2 nameservers are required');
      return;
    }
    for (const ns of filtered) {
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(ns)) {
        setError(`Invalid nameserver: ${ns}`);
        return;
      }
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not authenticated'); setSaving(false); return; }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/register-domain`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            action: 'update-nameservers',
            domainName,
            nameservers: filtered,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? 'Failed to update nameservers');
        setSaving(false);
        return;
      }

      setSuccess('Nameservers updated. Changes may take up to 48 hours to propagate.');
      setNameservers(filtered);
      setSaving(false);
      router.refresh();
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-gray-900">Nameservers</h2>
        {!isDefault && (
          <button
            onClick={resetToDefault}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to Envosta defaults
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Your domain is pointed to the following nameservers. Changes may take up to 48 hours to propagate.
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 mb-4">
          {success}
        </div>
      )}

      <div className="space-y-2 mb-4">
        {nameservers.map((ns, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-6 shrink-0">NS{i + 1}</span>
            <input
              type="text"
              value={ns}
              onChange={(e) => updateNs(i, e.target.value)}
              placeholder="ns1.example.com"
              className="input flex-1 font-mono text-sm"
            />
            {nameservers.length > 2 && (
              <button
                onClick={() => removeNs(i)}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                title="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {nameservers.length < 6 && (
          <button
            onClick={addNs}
            className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add Nameserver
          </button>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1"
        >
          {saving ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>
          ) : (
            <><Save className="w-3 h-3" /> Save Nameservers</>
          )}
        </button>
      </div>
    </div>
  );
}
