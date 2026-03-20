import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How We Reduced Average Load Times to Under 0.8 Seconds – Envosta Blog',
  description:
    'A deep dive into the infrastructure changes, caching strategies, and CDN optimizations that make Envosta-hosted sites among the fastest on the web.',
};

export default function BlogPostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
