import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Studio | White-Glove WordPress Management',
  description:
    'A dedicated team, priority infrastructure, and hands-on WordPress management. Envosta Studio is the white-glove tier for businesses that expect more.',
  alternates: { canonical: 'https://envosta.com/studio' },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
