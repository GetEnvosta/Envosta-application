'use client';

import { useState } from 'react';
import { Loader2, UserPlus, Check } from 'lucide-react';

export function AdminWpUser({ siteId }: { siteId: string }) {
  const [show, setShow] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleCreate() {
    if (!username || !email || !password) { setMsg('All fields required'); return; }
    if (password.length < 8) { setMsg('Password must be at least 8 characters'); return; }
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/site-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'wp-cli',
          siteId,
          value: `user create ${username} ${email} --role=administrator --user_pass=${password}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('WordPress user created');
        setShow(false);
        setUsername('');
        setEmail('');
        setPassword('');
      } else {
        setMsg(data.error ?? 'Failed to create user');
      }
    } catch { setMsg('Connection error'); }
    setLoading(false);
  }

  if (!show) {
    return (
      <button onClick={() => setShow(true)} className="btn-admin-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
        <UserPlus className="w-3.5 h-3.5" /> Add WP User
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-admin-200 bg-admin-50/30 p-4">
      <p className="text-sm font-medium text-gray-900 mb-3">Create WordPress Admin User</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="label">Username</label>
          <input type="text" className="input text-sm" placeholder="johndoe" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input text-sm" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Password</label>
          <input type="text" className="input text-sm font-mono" placeholder="Min 8 chars" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
      </div>
      {msg && <p className={`text-xs mb-2 ${msg.includes('created') ? 'text-emerald-600' : 'text-red-600'}`}>{msg}</p>}
      <div className="flex items-center gap-2">
        <button onClick={handleCreate} disabled={loading} className="btn-admin text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Create User
        </button>
        <button onClick={() => setShow(false)} className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
      </div>
    </div>
  );
}
