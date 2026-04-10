import type { Metadata } from 'next';
import PlansPage from '../plans/page';

export const metadata: Metadata = {
  title: 'Pricing — Envosta Managed WordPress Hosting',
  description: 'Managed WordPress hosting plans. Minimum $50/mo, Growth $129/mo, Performance $350/mo CAD.',
  alternates: { canonical: 'https://envosta.com/pricing' },
  openGraph: {
    title: 'Plans & Pricing — Envosta Managed WordPress Hosting',
    description: 'From $50 CAD/mo. Enterprise wp.cloud hosting with personal onboarding, free SSL, CDN, and daily backups.',
    url: 'https://envosta.com/pricing',
  },
  twitter: {
    title: 'Envosta Pricing — Managed WordPress from $50 CAD/mo',
    description: 'Enterprise hosting with personal onboarding. Minimum, Growth, and Performance plans.',
  },
};

export default function Page() {
  return <PlansPage />;
}
