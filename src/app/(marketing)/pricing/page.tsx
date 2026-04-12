import type { Metadata } from 'next';
import PlansPage from '../plans/page';

export const metadata: Metadata = {
  title: 'Pricing — Envosta Managed WordPress Hosting',
  description: 'Managed WordPress hosting plans. Growth $297 USD/mo with 297 credits included. Enterprise wp.cloud hosting.',
  alternates: { canonical: 'https://envosta.com/pricing' },
  openGraph: {
    title: 'Plans & Pricing — Envosta Managed WordPress Hosting',
    description: 'Enterprise wp.cloud hosting from $297 USD/mo. Personal onboarding, free SSL, CDN, daily backups, and 297 credits included.',
    url: 'https://envosta.com/pricing',
  },
  twitter: {
    title: 'Envosta Pricing — Managed WordPress Hosting',
    description: 'Enterprise hosting with personal onboarding. Growth and Performance plans with credits included.',
  },
};

export default function Page() {
  return <PlansPage />;
}
