'use client';

import { useState } from 'react';
import { Loader2, User, Search, X, Link2 } from 'lucide-react';
import Link from 'next/link';

export function SiteOwnerAssign({ siteId, currentOwner }: {
  siteId: string;
  currentOwner: { id: string; full_name: string | null; email: string } | null;
}) {
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleSearch() {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/search-users?q=${encodeURIComponent(search.trim())}`);
      const data = await res.json();
      setResults(data ?? []);
    } catch { setResults([]); }
    setSearching(false);
  }

  // Orphan a site — DB-only, no billing change.
  async function orphan() {
    if (!confirm('Remove the owner and orphan this site? Billing is NOT changed — the current line item stays where it is.')) return;
    setSaving(true);
    setMsg('');
    try {
      await fetch('/api/admin/assign-site-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, userId: null }),
      });
      window.location.reload();
    } catch { setMsg('Connection error'); setSaving(false); }
  }

  // Transfer to a real account — MOVES the Stripe billing + add-ons.
  async function transferTo(userId: string) {
    const u = results.find(r => r.id === userId);
    const who = u ? (u.full_name || u.email) : 'this account';
    if (!confirm(
      `Transfer this site to ${who}?\n\nThis moves the site's Stripe line item and any add-ons onto their subscription (proration applies). The current owner stops being billed for it. The WordPress site itself is unchanged.`
    )) return;
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/transfer-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, newUserId: userId }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error ?? 'Transfer failed'); setSaving(false); return; }
      const failed = (data.addons ?? []).filter((a: any) => !a.moved);
      if (data.warning || failed.length) {
        setMsg(
          `${data.warning ? data.warning + ' ' : ''}${failed.length ? `Add-ons needing a manual check: ${failed.map((a: any) => a.slug).join(', ')}. ` : ''}Reloading…`,
        );
        setTimeout(() => window.location.reload(), 2800);
        return;
      }
      window.location.reload();
    } catch { setMsg('Connection error'); setSaving(false); }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5 flex-1">
        <User className="w-4 h-4 text-gray-400 shrink-0" />
        {currentOwner ? (
          <>
            <Link href={`/admin/customers/${currentOwner.id}`} className="text-sm font-medium text-admin-600 hover:text-admin-700 truncate">
              {currentOwner.full_name || currentOwner.email}
            </Link>
            {currentOwner.full_name && <span className="text-xs text-gray-400 truncate hidden sm:inline">{currentOwner.email}</span>}
          </>
        ) : (
          <span className="text-sm text-amber-600 font-medium">No owner — orphaned site</span>
        )}
        <button onClick={() => setEditing(true)}
          className="ml-auto text-[10px] text-gray-400 hover:text-admin-600 font-medium shrink-0">
          {currentOwner ? 'Change' : 'Assign'}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-admin-200 bg-admin-50/30 px-4 py-3 flex-1 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
          <Link2 className="w-3 h-3" /> {currentOwner ? 'Change Owner' : 'Assign Owner'}
        </span>
        <button onClick={() => { setEditing(false); setResults([]); setSearch(''); }}
          className="p-0.5 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
      </div>

      <div className="flex gap-2">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
          placeholder="Search by name or email..."
          className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-admin-400 outline-none" />
        <button onClick={handleSearch} disabled={searching}
          className="px-2.5 py-1.5 text-xs font-medium text-white bg-admin-600 hover:bg-admin-700 rounded-lg disabled:opacity-50">
          {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-auto">
          {results.map((u: any) => (
            <button key={u.id} onClick={() => transferTo(u.id)} disabled={saving}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg hover:bg-admin-100 transition-colors text-left disabled:opacity-50">
              <div>
                <span className="font-medium text-gray-900">{u.full_name || 'Unnamed'}</span>
                <span className="text-gray-400 ml-1.5">{u.email}</span>
              </div>
              <span className="text-admin-600 font-medium shrink-0">Transfer →</span>
            </button>
          ))}
        </div>
      )}

      {msg && <p className="text-[11px] text-amber-600 leading-snug">{msg}</p>}

      <p className="text-[10px] text-gray-400 leading-snug">Transferring moves the Stripe billing (line item + add-ons) to the new owner, with proration.</p>

      {currentOwner && (
        <button onClick={orphan} disabled={saving}
          className="text-[10px] text-red-500 hover:text-red-600 font-medium">
          Remove owner (make orphan — no billing change)
        </button>
      )}
    </div>
  );
}
