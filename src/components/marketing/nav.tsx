'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { label: 'Studio', href: '/studio', badge: 'Currently Full' },
  { label: 'Features', href: '/features' },
  { label: 'Blog', href: '/blog' },
  { label: 'Support', href: '/support' },
  { label: 'Plans & Pricing', href: '/pricing' },
];

function LogoSvg() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id="nav-e">
          <rect width="64" height="64" rx="10" fill="white" />
          <rect x="19.2" y="17" width="25.6" height="5.4" fill="black" />
          <rect x="19.2" y="29.3" width="6.7" height="17.7" fill="black" />
          <rect x="25.5" y="29.3" width="16" height="5.4" fill="black" />
          <rect x="25.5" y="41.6" width="19.3" height="5.4" fill="black" />
        </mask>
      </defs>
      <rect width="64" height="64" rx="10" fill="currentColor" mask="url(#nav-e)" />
    </svg>
  );
}

export function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <>
      <nav className="site-nav">
        <div className="c">
          <Link href="/" className="logo">
            <div className="logo-mark"><LogoSvg /></div>
            <div className="logo-text">Env<span>o</span>sta</div>
          </Link>

          <ul className="nl">
            {navLinks.map(link => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`nav-link${isActive(link.href) ? ' nav-active' : ''}`}
                >
                  {link.label}
                  {'badge' in link && link.badge && (
                    <span className="nav-badge">{link.badge}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <div className="nc">
            <a href="https://my.envosta.com/auth/login" className="gh">Log in</a>
            <div className="block-button">
              <Link href="/get-started" className="bp">Get Started</Link>
            </div>
          </div>

          <button
            className="ham"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      <div className={`mn${mobileOpen ? ' open' : ''}`}>
        {navLinks.map(link => (
          <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
            {link.label}
            {'badge' in link && link.badge && (
              <span className="nav-badge">{link.badge}</span>
            )}
          </Link>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link href="/get-started" onClick={() => setMobileOpen(false)} className="bp lg" style={{ textAlign: 'center', width: '100%' }}>
            Get Started
          </Link>
          <a href="https://my.envosta.com/auth/login" onClick={() => setMobileOpen(false)}
            style={{ textAlign: 'center', padding: '14px 0', color: 'rgba(255,255,255,.6)', fontSize: '.95rem', textDecoration: 'none' }}>
            Log in
          </a>
        </div>
      </div>
    </>
  );
}
