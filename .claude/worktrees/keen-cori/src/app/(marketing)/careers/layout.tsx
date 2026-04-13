import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Careers — Join the Envosta Team',
  description: 'Join the Envosta team. We\'re hiring across engineering, design, support, and marketing. Remote-friendly, Calgary-based. Explore open roles.',
  alternates: { canonical: 'https://envosta.com/careers' },
  openGraph: {
    title: 'Careers — Join the Envosta Team',
    description: 'We\'re hiring. Engineering, design, support, marketing. Remote-friendly.',
    url: 'https://envosta.com/careers',
  },
};

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
