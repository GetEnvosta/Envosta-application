'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, CheckCircle, AlertCircle, Lock, CreditCard } from 'lucide-react';

export default function ClaimAccountPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [step, setStep] = useState<'loading' | 'claim' | 'success' | 'error' | 'expired'>('loading');
  const [account, setAccount] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setStep('error'); setError('No claim token provided'); return; }

    // Look up the unclaimed account
    const supabase = createClient();
    supabase
      .from('users')
      .select('id, full_name, email, claimed, claim_expires_at')
      .eq('claim_token', token)
      .eq('claimed', false)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setStep('error');
          setError('This claim link is invalid or has already been used.');
          return;
        }
        if (data.claim_expires_at && new Date(data.claim_expires_at) < new Date()) {
          setStep('expired');
          return;
        }
        setAccount(data);
        setStep('claim');
      });
  }, [token]);

  async function handleClaim() {
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const supabase = createClient();

      // Sign in with the email + temp password won't work since we don't know it.
      // Instead, use the password reset flow: generate a magic link or use admin API.
      // For simplicity, we'll call our API to handle the claim server-side.
      const res = await fetch('/api/auth/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to claim account');
        setSaving(false);
        return;
      }

      // Sign in with the new password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password,
      });

      if (signInError) {
        setError('Account claimed but sign-in failed. Try logging in manually.');
        setSaving(false);
        return;
      }

      setStep('success');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (e) {
      setError('Something went wrong');
      setSaving(false);
    }
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (step === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
        <div className="max-w-md w-full mx-auto p-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Link Expired</h1>
            <p className="text-sm text-gray-500">This claim link has expired. Please contact the person who set up your account to get a new one.</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
        <div className="max-w-md w-full mx-auto p-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid Link</h1>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
        <div className="max-w-md w-full mx-auto p-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Account Claimed!</h1>
            <p className="text-sm text-gray-500">Welcome to Envosta, {account?.full_name}. Redirecting to your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-8">
            <img src="/assets/Logo/envosta-logo-mark-dark.svg" alt="Envosta" className="w-10 h-10 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Claim Your Account</h1>
            <p className="text-sm text-gray-500">
              Hey {account?.full_name}, your site is ready. Set a password to get started.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg px-4 py-3 mb-6">
            <p className="text-xs text-gray-500">Account</p>
            <p className="text-sm font-medium text-gray-900">{account?.email}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <Lock className="w-3 h-3 inline mr-1" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                placeholder="At least 8 characters"
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                placeholder="Repeat password"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}

            <button
              onClick={handleClaim}
              disabled={saving || !password || !confirmPassword}
              className="w-full py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Claiming...' : 'Claim Account & Get Started'}
            </button>
          </div>

          <p className="text-[11px] text-gray-400 text-center mt-6">
            By claiming your account you agree to Envosta's terms of service.
          </p>
        </div>
      </div>
    </div>
  );
}
