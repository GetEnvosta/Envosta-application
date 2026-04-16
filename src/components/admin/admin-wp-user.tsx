'use client';

import { useState } from 'react';
import { Loader2, UserPlus, Check } from 'lucide-react';

/**
 * One-click button to create a standard Envosta admin user on the WP site.
 * Always creates: username=envosta, email=noreply@envosta.com, password=welcome
 */
export function AdminWpUser({ siteId }: { siteId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/site-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'wp-cli',
          siteId,
          value: 'user create envosta noreply@envosta.com --role=administrator --user_pass=welcome',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        setTimeout(() => setDone(false), 3000);
      } else {
        setError(data.error ?? 'Failed');
      }
    } catch { setError('Connection error'); }
    setLoading(false);
  }

  return (
    <>
      <button
        onClick={handleCreate}
        disabled={loading || done}
        className="btn-admin-secondary text-sm py-2 px-3 inline-flex items-center gap-1.5"
        title="Creates WP user: envosta / noreply@envosta.com / welcome"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : done ? (
          <Check className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <UserPlus className="w-3.5 h-3.5" />
        )}
        {done ? 'Added' : 'Add WP User'}
      </button>
      {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
    </>
  );
}
