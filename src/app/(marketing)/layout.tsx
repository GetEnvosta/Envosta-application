import type { Metadata } from 'next';
import { Inter, Archivo, IBM_Plex_Mono } from 'next/font/google';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { getSocialLinks } from '@/lib/site-settings';
import { CheckoutHeader } from '@/components/marketing/checkout-header';
import { publicPlans, CURRENCY } from '@/config/pricing';
import './marketing.css';
import './brand.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

// Charter §5 brand type system: Archivo (display), Inter (body), IBM Plex
// Mono (numbers/data/labels). All numerals render in Plex Mono.
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
  description:
    'A hosting company that only hosts the industries it chooses — so every plan includes the site, the SEO, and the reviews. Built on wp.cloud by Automattic. White-glove, hands-free.',
  keywords: ['managed WordPress hosting', 'industry-specialized hosting', 'wp.cloud', 'HVAC website hosting', 'roofing website hosting', 'local SEO hosting', 'Canadian hosting'],
  openGraph: {
    siteName: 'Envosta',
    type: 'website',
    locale: 'en_CA',
    title: 'Envosta — Industry-Specialized Managed WordPress Hosting',
    description:
      'Hosting plans that include the industry-specialized site, the search work, and the review engine. Built on wp.cloud by Automattic — direct partner, not a reseller.',
    images: [{ url: '/assets/Logo/envosta-logo-mark-dark.svg', width: 512, height: 512, alt: 'Envosta' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Envosta — Industry-Specialized Managed WordPress Hosting',
    description:
      'Hosting plans that include the industry-specialized site, the search work, and the review engine.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://envosta.com',
  },
};

// Organization schema — offers reflect PUBLIC plans only (the hidden
// Minimum plan never appears in structured data, charter §2).
const publics = publicPlans();
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Envosta',
  url: 'https://envosta.com',
  logo: 'https://envosta.com/assets/Logo/envosta-logo-mark-dark.svg',
  description:
    'Industry-specialized managed WordPress hosting — the site, the SEO, and the reviews included in every plan. Built on wp.cloud by Automattic.',
  address: { '@type': 'PostalAddress', addressLocality: 'Calgary', addressRegion: 'AB', addressCountry: 'CA' },
  sameAs: [],
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: CURRENCY,
    lowPrice: String(Math.round((publics[0]?.monthlyCents ?? 0) / 100)),
    highPrice: String(Math.round((publics[publics.length - 1]?.monthlyCents ?? 0) / 100)),
    offerCount: String(publics.length),
  },
};

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const socials = await getSocialLinks();
  const ld = { ...jsonLd, sameAs: Object.values(socials).filter(Boolean) };
  return (
    <div className={`marketing-site ${inter.variable} ${archivo.variable} ${plexMono.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <MarketingNav />
      <CheckoutHeader />
      <main>{children}</main>
      <MarketingFooter socials={socials} />
    </div>
  );
}
