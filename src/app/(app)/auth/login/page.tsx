'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2 } from 'lucide-react';

const promos = [
  {
    tag: 'Envosta Studio',
    heading: 'We design, build, and\nlaunch your website.',
    desc: 'Custom WordPress design and development — from concept to live site. You describe it, we create it.',
  },
  {
    tag: 'Enterprise Infrastructure',
    heading: 'Built on wp.cloud.\nThe platform behind WordPress.com.',
    desc: 'Auto-scaling PHP workers, global CDN, daily backups, and 99.99% uptime — included on every plan.',
  },
  {
    tag: 'Guided Onboarding',
    heading: 'We make sure everything\nis set up right.',
    desc: 'DNS, email, SSL, security, and performance — our team walks you through it and configures it all.',
  },
  {
    tag: 'Managed WordPress Hosting',
    heading: 'Your hosting, handled\nfrom day one.',
    desc: 'Enterprise infrastructure, hands-on support, and a team that actually knows your site.',
  },
];

function LoginForm() {
  const searchParams = useSearchParams();
  const isCheckoutSuccess = searchParams.get('checkout') === 'success';
  const prefillEmail = searchParams.get('email') ?? '';
  const redirect = searchParams.get('redirect') ?? '/dashboard';

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [promoIdx, setPromoIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setPromoIdx(i => (i + 1) % promos.length);
        setFade(true);
      }, 400);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const promo = promos[promoIdx];

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
      {/* Left panel — rotating marketing */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #03060e 0%, #0a1628 50%, #0f1d36 100%)' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(37,99,235,.15), transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 70% 80%, rgba(37,99,235,.08), transparent 50%)' }} />

        <div className="relative z-10 flex flex-col p-12 w-full" style={{ minHeight: '100%' }}>
          <div className="flex items-center gap-3">
            <img src="/assets/Logo/envosta-logo-mark.svg" alt="Envosta" style={{ width: 32, height: 32 }} />
            <span style={{ fontSize: '1.2rem', fontWeight: 300, color: '#fff', letterSpacing: '-.5px' }}>
              Envosta
            </span>
          </div>

          <div className="flex-1 flex items-center">
          <div style={{ transition: 'opacity .4s ease', opacity: fade ? 1 : 0, width: '100%' }}>
            <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, background: 'rgba(37,99,235,.15)', border: '1px solid rgba(37,99,235,.25)', marginBottom: 20 }}>
              <span style={{ fontSize: '.75rem', fontWeight: 500, color: '#60a5fa', letterSpacing: '.3px' }}>{promo.tag}</span>
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 400, color: '#fff', letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 16, whiteSpace: 'pre-line' }}>
              {promo.heading}
            </h2>
            <p style={{ fontSize: '.95rem', color: 'rgba(255,255,255,.45)', lineHeight: 1.7, maxWidth: 400, fontWeight: 300 }}>
              {promo.desc}
            </p>
          </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,.4)' }} />
              <span style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.35)', fontFamily: 'monospace', letterSpacing: '.5px' }}>All systems operational</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {promos.map((_, i) => (
                <div key={i} style={{ width: i === promoIdx ? 20 : 6, height: 6, borderRadius: 3, background: i === promoIdx ? '#2563EB' : 'rgba(255,255,255,.15)', transition: 'all .4s ease' }} />
              ))}
            </div>
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
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-base text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:bg-white"
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
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-base text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:bg-white"
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
