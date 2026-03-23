import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import '../(marketing)/marketing.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://envosta.com'),
  title: {
    template: '%s | Envosta',
    default: 'Envosta — WordPress Hosting Made Simple',
  },
};

export default function StandaloneLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`marketing-site ${inter.variable}`}>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 28, height: 28 }}>
            <defs>
              <mask id="standalone-e">
                <rect width="64" height="64" rx="10" fill="white" />
                <rect x="19.2" y="17" width="25.6" height="5.4" fill="black" />
                <rect x="19.2" y="29.3" width="6.7" height="17.7" fill="black" />
                <rect x="25.5" y="29.3" width="16" height="5.4" fill="black" />
                <rect x="25.5" y="41.6" width="19.3" height="5.4" fill="black" />
              </mask>
            </defs>
            <rect width="64" height="64" rx="10" fill="currentColor" mask="url(#standalone-e)" />
          </svg>
          <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--t1)', letterSpacing: '-.5px' }}>
            Env<span style={{ color: 'var(--gold)' }}>o</span>sta
          </span>
        </Link>
        <a
          href="https://my.envosta.com/auth/login"
          style={{
            fontSize: '.85rem', color: 'var(--t2)', textDecoration: 'none',
            padding: '8px 20px', borderRadius: 100,
            border: '1px solid rgba(255,255,255,.12)',
            transition: 'border-color .2s, color .2s',
          }}
        >
          Log in
        </a>
      </header>
      {children}
    </div>
  );
}
