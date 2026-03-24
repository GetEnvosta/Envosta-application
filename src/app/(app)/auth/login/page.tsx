'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2 } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const isCheckoutSuccess = searchParams.get('checkout') === 'success';
  const prefillEmail = searchParams.get('email') ?? '';
  const redirect = searchParams.get('redirect') ?? '/dashboard';

  const [email, setEmail] = useState(prefillEmail);
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
    window.location.href = redirect;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #03060e 0%, #0a1628 50%, #0f1d36 100%)' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(37,99,235,.15), transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 70% 80%, rgba(37,99,235,.08), transparent 50%)' }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 32, height: 32 }}>
              <defs>
                <mask id="login-e">
                  <rect width="64" height="64" rx="10" fill="white" />
                  <rect x="19.2" y="17" width="25.6" height="5.4" fill="black" />
                  <rect x="19.2" y="29.3" width="6.7" height="17.7" fill="black" />
                  <rect x="25.5" y="29.3" width="16" height="5.4" fill="black" />
                  <rect x="25.5" y="41.6" width="19.3" height="5.4" fill="black" />
                </mask>
              </defs>
              <rect width="64" height="64" rx="10" fill="white" mask="url(#login-e)" />
            </svg>
            <span style={{ fontSize: '1.2rem', fontWeight: 300, color: '#fff', letterSpacing: '-.5px' }}>
              Env<span style={{ fontWeight: 400 }}>o</span>sta
            </span>
          </div>

          <div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 400, color: '#fff', letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 16 }}>
              WordPress hosting,<br />handled from day one.
            </h2>
            <p style={{ fontSize: '.95rem', color: 'rgba(255,255,255,.45)', lineHeight: 1.7, maxWidth: 400, fontWeight: 300 }}>
              Enterprise infrastructure, personal onboarding, and a team that actually knows your site.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,.4)' }} />
              <span style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.35)', fontFamily: 'monospace', letterSpacing: '.5px' }}>All systems operational</span>
            </div>
            <span style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.2)' }}>99.99% uptime</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-white px-6">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <img src="/assets/Logo/envosta-logo-mark-dark.svg" alt="Envosta" className="w-7 h-7" />
            <span className="text-lg font-bold text-gray-900 tracking-tight">Envosta</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Welcome back</h1>
            <p className="text-gray-500 mt-1.5 text-sm">Sign in to your hosting dashboard</p>
          </div>

          {isCheckoutSuccess && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mb-6">
              <p className="text-sm font-medium text-emerald-800">Payment successful!</p>
              <p className="text-xs text-emerald-600 mt-0.5">Sign in with the password you created to access your dashboard.</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:bg-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <a href="/auth/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Forgot?
                </a>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <a href="https://envosta.com/get-started" className="text-blue-600 hover:text-blue-700 font-medium">
                Get started
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
