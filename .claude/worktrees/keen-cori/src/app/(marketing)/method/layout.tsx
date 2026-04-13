import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Envosta Method — From Idea to Authority',
  description: 'Seven phases. One clear path. The Envosta Method gets your site live faster, performing better, and built to grow from day one.',
  alternates: { canonical: 'https://envosta.com/method' },
  openGraph: {
    title: 'The Envosta Method — From Idea to Authority',
    description: 'Seven phases from discovery to authority. Here\'s how we build websites that grow with your business.',
    url: 'https://envosta.com/method',
  },
  twitter: {
    title: 'The Envosta Method — 7 Phases to a Website That Works',
    description: 'Discovery, design, build, launch, optimize, grow, authority. The complete Envosta process.',
  },
};

export default function MethodLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
