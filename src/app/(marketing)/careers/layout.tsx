import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Careers | Join Our Team',
  description:
    'Join the Envosta team. We are hiring across engineering, design, support, and marketing. Explore open roles and apply today.',
  alternates: { canonical: 'https://envosta.com/careers' },
};

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
