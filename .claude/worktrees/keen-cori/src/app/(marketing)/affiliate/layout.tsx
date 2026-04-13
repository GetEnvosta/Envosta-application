import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partner & Affiliate Program — Envosta',
  description: 'Earn commissions on every referral. Join as an agency partner or affiliate — get your referral link, rep code, and marketing tools. Flat-rate payouts.',
  alternates: { canonical: 'https://envosta.com/affiliate' },
  openGraph: {
    title: 'Partner & Affiliate Program — Envosta',
    description: 'Earn commissions referring clients to Envosta. Agency and affiliate tracks available.',
    url: 'https://envosta.com/affiliate',
  },
};

export default function AffiliateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
