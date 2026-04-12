'use client';

import { useState } from 'react';
import { Loader2, Plus, Search, X, Globe } from 'lucide-react';

export function AdminCreateDomain() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [domain, setDomain] = useState('');
  const [period, setPeriod] = useState(1);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
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

  async function checkDomain() {
    if (!domain.trim()) return;
    setChecking(true);
    setAvailable(null);
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', domain: domain.trim() }),
      });
      const data = await res.json();
      setAvailable(data.available === true);
    } catch { setAvailable(false); }
    setChecking(false);
  }

  async function handleRegister() {
    if (!selectedUser || !domain.trim()) return;
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/register-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          domain: domain.trim(),
          period,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, msg: `Domain "${domain}" registered for ${selectedUser.full_name || selectedUser.email}` });
        setDomain('');
        setSelectedUser(null);
        setAvailable(null);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setResult({ ok: false, msg: data.error || 'Failed to register domain' });
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
        <Plus className="w-4 h-4" /> Register Domain
      </button>
    );
  }

  return (
    <div className="card p-5 mb-6 border-l-4 border-indigo-400 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Globe className="w-4 h-4 text-indigo-600" /> Register Domain
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

      {/* Domain + period */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Domain Name</label>
          <div className="flex gap-2">
            <input type="text" value={domain} onChange={e => { setDomain(e.target.value); setAvailable(null); }}
              placeholder="example.com" className="flex-1 input text-sm" />
            <button onClick={checkDomain} disabled={checking || !domain.trim()} className="btn-admin px-3 text-xs">
              {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Check'}
            </button>
          </div>
          {available !== null && (
            <p className={`text-xs mt-1 font-medium ${available ? 'text-emerald-600' : 'text-red-600'}`}>
              {available ? 'Available' : 'Not available'}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Period</label>
          <select value={period} onChange={e => setPeriod(parseInt(e.target.value))} className="input w-full text-sm">
            {[1, 2, 3, 5, 10].map(y => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
          </select>
        </div>
      </div>

      {result && (
        <p className={`text-xs font-medium ${result.ok ? 'text-emerald-600' : 'text-red-600'}`}>{result.msg}</p>
      )}

      <div className="flex justify-end">
        <button onClick={handleRegister} disabled={saving || !selectedUser || !domain.trim()}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Register Domain
        </button>
      </div>
    </div>
  );
}
