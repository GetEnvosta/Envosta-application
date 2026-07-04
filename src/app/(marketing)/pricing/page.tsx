import type { Metadata } from 'next';
import PlansPage from '../plans/page';

export const metadata: Metadata = {
  title: 'Hosting Plans & Pricing — Envosta',
  description:
    'Industry-specialized managed WordPress hosting plans — the site, the SEO, and the reviews included. Monthly pricing, honest exclusivity, 13th month free on annual prepay.',
  alternates: { canonical: 'https://envosta.com/plans' },
};

export default function Page() {
  return <PlansPage />;
}
