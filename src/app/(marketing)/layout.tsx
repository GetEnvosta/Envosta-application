import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { getSocialLinks } from '@/lib/site-settings';
import { CheckoutHeader } from '@/components/marketing/checkout-header';
import './marketing.css';

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
    default: 'Envosta — Managed WordPress Hosting | Built on wp.cloud',
  },
  description: 'Enterprise-grade WordPress hosting powered by wp.cloud infrastructure. Personal onboarding, custom design, and hands-on support — every plan in CAD.',
  keywords: ['WordPress hosting', 'managed hosting', 'wp.cloud', 'WordPress design', 'WooCommerce hosting', 'Canadian hosting', 'enterprise WordPress'],
  openGraph: {
    siteName: 'Envosta',
    type: 'website',
    locale: 'en_CA',
    title: 'Envosta — Managed WordPress Hosting',
    description: 'Enterprise infrastructure, personal onboarding, and a team that actually knows your site. Pricing in CAD.',
    images: [{ url: '/assets/Logo/envosta-logo-mark-dark.svg', width: 512, height: 512, alt: 'Envosta' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Envosta — Managed WordPress Hosting',
    description: 'Enterprise infrastructure, personal onboarding, and a team that actually knows your site.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://envosta.com',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Envosta',
  url: 'https://envosta.com',
  logo: 'https://envosta.com/assets/Logo/envosta-logo-mark-dark.svg',
  description: 'Managed WordPress hosting powered by wp.cloud infrastructure.',
  address: { '@type': 'PostalAddress', addressLocality: 'Calgary', addressRegion: 'AB', addressCountry: 'CA' },
  sameAs: [],
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '105',
    highPrice: '2300',
    offerCount: '3',
  },
};

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const socials = await getSocialLinks();
  const ld = { ...jsonLd, sameAs: Object.values(socials).filter(Boolean) };
  return (
    <div className={`marketing-site ${inter.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <MarketingNav />
      <CheckoutHeader />
      <main>{children}</main>
      <MarketingFooter socials={socials} />
    </div>
  );
}
