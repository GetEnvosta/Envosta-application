import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partner Program',
  description:
    'Earn a flat commission on every sale you close. Join Envosta as an agency partner or sales partner — get your referral link, rep code, and sales tools.',
  alternates: { canonical: 'https://envosta.com/affiliate' },
};

export default function AffiliateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
