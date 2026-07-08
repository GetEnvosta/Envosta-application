import type { Metadata } from 'next';
import PlansPage from '../plans/page';

export const metadata: Metadata = {
  title: 'Pricing — Envosta Managed WordPress Hosting',
  description: 'Managed WordPress hosting plans with personal onboarding, AI tools, free SSL, CDN, daily backups, and free site migration.',
  alternates: { canonical: 'https://envosta.com/pricing' },
  openGraph: {
    title: 'Plans & Pricing — Envosta Managed WordPress Hosting',
    description: 'Managed WordPress hosting with personal onboarding, AI tools, free SSL, CDN, and the essentials baked into every plan.',
    url: 'https://envosta.com/pricing',
  },
  twitter: {
    title: 'Envosta Pricing — Managed WordPress Hosting',
    description: 'Managed WordPress hosting with personal onboarding, AI tools, and the essentials baked in.',
  },
};

export default function Page() {
  return <PlansPage />;
}
