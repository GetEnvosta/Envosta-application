'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    window.location.href = '/dashboard';
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Envosta</h1>
          <p className="text-gray-500 mt-1 text-sm">Sign in to your hosting dashboard</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-500">
            <Link href="/auth/forgot-password" className="text-brand-600 hover:text-brand-700">
              Forgot password?
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-brand-600 hover:text-brand-700 font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
