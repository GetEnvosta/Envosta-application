'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });
    if (err) { setError(err.message); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="card p-8">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Check your email</h2>
            <p className="text-sm text-gray-500 mt-2">
              We sent a confirmation link to <span className="font-medium text-gray-700">{email}</span>.
              Click the link to activate your account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Envosta</h1>
          <p className="text-gray-500 mt-1 text-sm">Create your hosting account</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}
            <div>
              <label className="label">Full name</label>
              <input type="text" className="input" value={fullName}
                onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" required />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" required minLength={8} />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-brand-600 hover:text-brand-700 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
