/**
 * /v2 — the Rev 1.4 site preview, mounted BESIDE the live marketing site
 * so Koltyn can compare both and decide (staging-style evaluation).
 *
 * Self-contained: its own fonts, brand.css, and mk2 chrome — it never
 * touches the production marketing layout. noindex + out of the sitemap:
 * this tree is for evaluation, not for search engines.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Inter, Archivo, IBM_Plex_Mono } from 'next/font/google';
import './brand.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-archivo',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://envosta.com'),
  title: {
    template: '%s | Envosta',
    default: 'Envosta — Industry-Specialized Managed WordPress Hosting',
  },
  robots: { index: false, follow: false },
};

const NAV = [
  { label: 'Hosting Plans', href: '/v2/plans' },
  { label: 'Industries', href: '/v2/industries' },
  { label: 'Service Promise', href: '/v2/service-promise' },
  { label: 'The Stack', href: '/v2/stack' },
];

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`mk2 ${inter.variable} ${archivo.variable} ${plexMono.variable}`} style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .v2-nav{position:sticky;top:0;z-index:50;background:rgba(10,25,41,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--navy-edge)}
        .v2-nav .inner{max-width:1120px;margin:0 auto;padding:0 20px;display:flex;align-items:center;gap:22px;min-height:60px}
        .v2-brand{font-family:var(--font-display);font-weight:800;font-size:.95rem;letter-spacing:.3em;color:var(--paper);text-decoration:none}
        .v2-brand span{color:var(--amber)}
        .v2-links{display:none;gap:20px;margin-left:auto}
        @media(min-width:880px){.v2-links{display:flex}}
        .v2-links a{font-family:var(--font-mono);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--steel);text-decoration:none;padding:8px 2px}
        .v2-links a:hover{color:var(--paper)}
        .v2-cta{margin-left:auto}
        @media(min-width:880px){.v2-cta{margin-left:0}}
        .v2-preview-tag{font-family:var(--font-mono);font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;color:var(--amber);border:1px solid rgba(255,182,39,.4);border-radius:3px;padding:3px 8px}
        .v2-footer{border-top:1px solid var(--navy-edge);margin-top:auto}
        .v2-footer .inner{max-width:1120px;margin:0 auto;padding:34px 20px;display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between}
        .v2-footer p{font-family:var(--font-mono);font-size:.68rem;color:var(--steel-dim)}
        .v2-footer nav{display:flex;flex-wrap:wrap;gap:16px}
        .v2-footer a{font-family:var(--font-mono);font-size:.68rem;letter-spacing:.08em;color:var(--steel);text-decoration:none}
        .v2-footer a:hover{color:var(--paper)}
      `}</style>

      <header className="v2-nav">
        <div className="inner">
          <Link href="/v2" className="v2-brand">ENVO<span>STA</span></Link>
          <span className="v2-preview-tag">Rev 1.4 preview</span>
          <nav className="v2-links" aria-label="v2">
            {NAV.map((l) => (
              <Link key={l.href} href={l.href}>{l.label}</Link>
            ))}
          </nav>
          <div className="v2-cta">
            <Link href="/v2/scorecard" className="btn btn--primary" style={{ padding: '10px 18px', minHeight: 40, fontSize: '.82rem' }}>
              Get Your Scorecard
            </Link>
          </div>
        </div>
      </header>

      <main style={{ flex: 1 }}>{children}</main>

      <footer className="v2-footer">
        <div className="inner">
          <p>© {new Date().getFullYear()} Envosta Inc. · Rev 1.4 preview — the live site is at <Link href="/" style={{ color: 'var(--amber)' }}>envosta.com</Link></p>
          <nav aria-label="v2 footer">
            {NAV.map((l) => (
              <Link key={l.href} href={l.href}>{l.label}</Link>
            ))}
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/terms">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
