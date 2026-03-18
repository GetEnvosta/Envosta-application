'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?redirect=/dashboard/settings`,
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Envosta</h1>
          <p className="text-gray-500 mt-1 text-sm">Reset your password</p>
        </div>
        <div className="card p-6">
          {sent ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600">If an account exists for <strong>{email}</strong>, you&apos;ll receive a reset link shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>
        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/auth/login" className="text-brand-600 hover:text-brand-700 font-medium">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
