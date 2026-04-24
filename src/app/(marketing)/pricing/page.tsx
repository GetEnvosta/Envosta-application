import type { Metadata } from 'next';
import PlansPage from '../plans/page';

export const metadata: Metadata = {
  title: 'Pricing — Envosta Managed WordPress Hosting',
  description: 'Two simple plans: Minimum at $36 USD/mo for managed WordPress hosting, or Growth at $297 USD/mo with AI tools, full onboarding, and up to 5 sites.',
  alternates: { canonical: 'https://envosta.com/pricing' },
  openGraph: {
    title: 'Plans & Pricing — Envosta Managed WordPress Hosting',
    description: 'Managed WordPress hosting from $36 USD/mo. Growth plan at $297 USD/mo with AI tools, onboarding, free SSL, CDN, and up to 5 sites.',
    url: 'https://envosta.com/pricing',
  },
  twitter: {
    title: 'Envosta Pricing — Managed WordPress Hosting',
    description: 'Managed WordPress hosting from $36 USD/mo. Growth at $297 USD/mo with AI tools, full onboarding, and up to 5 sites.',
  },
};

export default function Page() {
  return <PlansPage />;
}
