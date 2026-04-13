import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support Center & FAQ — Envosta WordPress Hosting',
  description: 'Get help from the Envosta team. Browse FAQs, submit a support request, or schedule a call with our WordPress hosting experts. Available for all plans.',
  alternates: { canonical: 'https://envosta.com/support' },
  openGraph: {
    title: 'Support Center & FAQ — Envosta',
    description: 'Browse FAQs, submit support requests, or schedule a call with our WordPress hosting experts.',
    url: 'https://envosta.com/support',
  },
  twitter: {
    title: 'Support Center & FAQ — Envosta',
    description: 'Browse FAQs, submit support requests, or schedule a call with our WordPress hosting experts.',
  },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
