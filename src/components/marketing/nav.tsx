'use client';

import { useState } from 'react';
import Link from 'next/link';

const navLinks = [
  { label: 'Studio', href: '/studio', accent: true },
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
                {'accent' in link && link.accent ? (
                  <Link href={link.href} className="nav-studio">
                    <span className="nav-studio-icon">&#9670;</span>
                    {link.label}
                  </Link>
                ) : (
                  <Link href={link.href}>{link.label}</Link>
                )}
              </li>
            ))}
          </ul>

          <div className="nc">
            <a href="https://my.envosta.com/auth/login" className="gh">Log in</a>
            <div className="block-button">
              <Link href="/pricing" className="bp">Get Started</Link>
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
          <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
            className={'accent' in link && link.accent ? 'nav-studio-mobile' : undefined}>
            {'accent' in link && link.accent && <span className="nav-studio-icon">&#9670;</span>}
            {link.label}
          </Link>
        ))}
        <a href="https://my.envosta.com/auth/login" onClick={() => setMobileOpen(false)}>
          Log in
        </a>
      </div>
    </>
  );
}
