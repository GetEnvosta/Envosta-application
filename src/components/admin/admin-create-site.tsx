'use client';

import { useState } from 'react';
import { Loader2, Plus, Search, X, Server } from 'lucide-react';

const REGIONS = [
  { id: 'dca', label: 'US East (Virginia)' },
  { id: 'bur', label: 'US West (California)' },
  { id: 'dfw', label: 'US Central (Texas)' },
  { id: 'ams', label: 'EU West (Amsterdam)' },
];

export function AdminCreateSite() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [label, setLabel] = useState('');
  const [region, setRegion] = useState('dca');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function searchUsers() {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/search-users?q=${encodeURIComponent(search.trim())}`);
      setUsers(await res.json());
    } catch { setUsers([]); }
    setSearching(false);
  }

  async function handleCreate() {
    if (!selectedUser || !label.trim()) return;
    setSaving(true);
    setResult(null);
    try {
      // Create site record directly (no subscription required for admin)
      const res = await fetch('/api/admin/create-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          label: label.trim(),
          region,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, msg: `Site "${label}" created for ${selectedUser.full_name || selectedUser.email}` });
        setLabel('');
        setSelectedUser(null);
        setSearch('');
        setUsers([]);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setResult({ ok: false, msg: data.error || 'Failed to create site' });
      }
    } catch (e: any) {
      setResult({ ok: false, msg: e.message });
    }
    setSaving(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
        <Plus className="w-4 h-4" /> Create Site
      </button>
    );
  }

  return (
    <div className="card p-5 mb-6 border-l-4 border-indigo-400 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Server className="w-4 h-4 text-indigo-600" /> Create Site
        </h3>
        <button onClick={() => { setOpen(false); setResult(null); }}
          className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>

      {/* Owner search */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Owner</label>
        {selectedUser ? (
          <div className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-lg">
            <span className="text-sm font-medium text-gray-900">{selectedUser.full_name || 'Unnamed'}</span>
            <span className="text-xs text-gray-400">{selectedUser.email}</span>
            <button onClick={() => { setSelectedUser(null); setUsers([]); }} className="ml-auto text-xs text-red-500">Change</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchUsers(); } }}
              placeholder="Search by name or email..." className="flex-1 input text-sm" />
            <button onClick={searchUsers} disabled={searching} className="btn-admin px-3">
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
        {users.length > 0 && !selectedUser && (
          <div className="mt-1 border border-gray-200 rounded-lg max-h-32 overflow-auto divide-y divide-gray-100">
            {users.map((u: any) => (
              <button key={u.id} onClick={() => setSelectedUser(u)}
                className="w-full px-3 py-2 text-left text-xs hover:bg-indigo-50 transition-colors">
                <span className="font-medium text-gray-900">{u.full_name || 'Unnamed'}</span>
                <span className="text-gray-400 ml-2">{u.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Site details */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Site Label</label>
          <input type="text" value={label} onChange={e => setLabel(e.target.value)}
            placeholder="my-business-site" className="input w-full text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Region</label>
          <select value={region} onChange={e => setRegion(e.target.value)} className="input w-full text-sm">
            {REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
      </div>

      {result && (
        <p className={`text-xs font-medium ${result.ok ? 'text-emerald-600' : 'text-red-600'}`}>{result.msg}</p>
      )}

      <div className="flex justify-end">
        <button onClick={handleCreate} disabled={saving || !selectedUser || !label.trim()}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Create & Provision
        </button>
      </div>
    </div>
  );
}
