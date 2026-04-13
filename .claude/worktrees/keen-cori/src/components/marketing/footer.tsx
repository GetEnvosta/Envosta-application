import Link from 'next/link';

function LogoSvg() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id="ftr-e">
          <rect width="64" height="64" rx="10" fill="white" />
          <rect x="19.2" y="17" width="25.6" height="5.4" fill="black" />
          <rect x="19.2" y="29.3" width="6.7" height="17.7" fill="black" />
          <rect x="25.5" y="29.3" width="16" height="5.4" fill="black" />
          <rect x="25.5" y="41.6" width="19.3" height="5.4" fill="black" />
        </mask>
      </defs>
      <rect width="64" height="64" rx="10" fill="currentColor" mask="url(#ftr-e)" />
    </svg>
  );
}

const footerColumns = [
  {
    title: 'Hosting',
    links: [
      { label: 'WordPress Hosting', href: '/pricing' },
      { label: 'WooCommerce Hosting', href: '/pricing' },
      { label: 'Enterprise Hosting', href: '/features' },
      { label: 'Plans & Pricing', href: '/pricing' },
      { label: 'Studio', href: '/studio' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'The Method', href: '/method' },
      { label: 'Onboarding', href: '/onboarding' },
      { label: 'Careers', href: '/careers' },
      { label: 'Affiliates', href: '/affiliate' },
      { label: 'Contact Us', href: '/support' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'Support Center', href: '/support' },
      { label: 'Features', href: '/features' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'Terms of Service', href: '/legal/terms' },
      { label: 'Cookie Policy', href: '/legal/cookies' },
      { label: 'GDPR', href: '/legal/gdpr' },
    ],
  },
];

const socialLinks = [
  { label: 'Twitter', icon: '𝕏' },
  { label: 'LinkedIn', icon: 'in' },
  { label: 'Facebook', icon: 'f' },
  { label: 'YouTube', icon: '▶' },
];

export function MarketingFooter() {
  return (
    <footer>
      <div className="c">
        <div className="fg-f">
          <div className="fbr">
            <Link href="/" className="logo" style={{ marginBottom: 16 }}>
              <div className="logo-mark"><LogoSvg /></div>
              <div className="logo-text">Envosta</div>
            </Link>
            <p style={{ maxWidth: 280 }}>
              Hosting that starts with a consultation. Enterprise infrastructure,
              expert support, and hands-on onboarding.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              {socialLinks.map(s => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'var(--card)', border: '1px solid var(--bdr)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--t3)', textDecoration: 'none', fontSize: '.75rem',
                    transition: 'all .2s',
                  }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {footerColumns.map(col => (
            <div key={col.title} className="fcol">
              <h5>{col.title}</h5>
              <ul>
                {col.links.map(link => (
                  <li key={link.label}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="f-bottom">
          <p>&copy; {new Date().getFullYear()} Envosta Inc. All rights reserved.</p>
          <div className="f-links">
            <Link href="/legal/privacy">Privacy Policy</Link>
            <Link href="/legal/terms">Terms of Service</Link>
            <Link href="/legal/cookies">Cookie Policy</Link>
            <Link href="/legal/gdpr">GDPR</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
