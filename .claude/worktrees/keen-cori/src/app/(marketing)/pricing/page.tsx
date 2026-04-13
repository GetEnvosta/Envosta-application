import type { Metadata } from 'next';
import PricingPage from './pricing-page';

export const metadata: Metadata = {
  title: 'Pricing — Envosta | AI Receptionist + Website for Small Business',
  description: 'One plan. $129/month. AI receptionist, professional website, lead capture, booking — all managed. Add what you need as you grow.',
  alternates: { canonical: 'https://envosta.com/pricing' },
  openGraph: {
    title: 'Pricing — One Plan. Everything Your Business Needs.',
    description: 'AI receptionist answers calls 24/7, books appointments, captures leads. Professional website included. $129/month.',
    url: 'https://envosta.com/pricing',
  },
  twitter: {
    title: 'Envosta Pricing — $129/mo for AI receptionist + website',
    description: 'Stop missing customers. One plan, everything managed.',
  },
};

export default function Page() {
  return <PricingPage />;
}
