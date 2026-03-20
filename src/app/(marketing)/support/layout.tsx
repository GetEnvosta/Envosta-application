import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support Center',
  description: 'Get help from the Envosta team. Browse FAQs, submit a support request, or schedule a call with our WordPress experts.',
  alternates: { canonical: 'https://envosta.com/support' },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
