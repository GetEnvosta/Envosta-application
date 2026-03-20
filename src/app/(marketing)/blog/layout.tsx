import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog | WordPress Hosting Insights',
  description:
    'Hosting tips, WordPress guides, and expert insights for business owners — written by the Envosta team.',
  alternates: {
    canonical: '/blog',
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
