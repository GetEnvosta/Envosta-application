'use client';

/**
 * <CheckoutHeader> — minimal logo + Log-in bar for the checkout flows
 * (/get-started, /buy-domain). Replaces the chrome those pages had under
 * the old (standalone) route group, without bringing back the full
 * marketing nav.
 *
 * Renders null on every other path so it can sit safely inside the
 * marketing layout next to <MarketingNav />.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SHOW_ON = ['/get-started', '/buy-domain'];

export function CheckoutHeader() {
  const pathname = usePathname();
  if (!SHOW_ON.some(p => pathname === p || pathname.startsWith(p + '/'))) return null;

  return (
    <header
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px',
      }}
    >
      <Link
        href="/"
        className="logo"
        style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
      >
        <div className="logo-mark">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <mask id="checkout-e">
                <rect width="64" height="64" rx="10" fill="white" />
                <rect x="19.2" y="17" width="25.6" height="5.4" fill="black" />
                <rect x="19.2" y="29.3" width="6.7" height="17.7" fill="black" />
                <rect x="25.5" y="29.3" width="16" height="5.4" fill="black" />
                <rect x="25.5" y="41.6" width="19.3" height="5.4" fill="black" />
              </mask>
            </defs>
            <rect width="64" height="64" rx="10" fill="currentColor" mask="url(#checkout-e)" />
          </svg>
        </div>
        <div className="logo-text">Envosta</div>
      </Link>
      <Link
        href="/auth/login"
        style={{
          fontSize: '.85rem', color: 'var(--t2)', textDecoration: 'none',
          padding: '8px 20px', borderRadius: 100,
          border: '1px solid rgba(255,255,255,.12)',
          transition: 'border-color .2s, color .2s',
        }}
      >
        Log in
      </Link>
    </header>
  );
}
