import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Products — Managed WordPress Hosting on wp.cloud',
  description: 'Explore Envosta products: managed WordPress hosting on wp.cloud, domain registration, Google Workspace email, free migration, global CDN, daily backups, and hands-on onboarding.',
  alternates: { canonical: 'https://envosta.com/products' },
  openGraph: {
    title: 'Products — Managed WordPress Hosting on wp.cloud',
    description: 'wp.cloud infrastructure, daily backups, global CDN, free SSL, domain registration, and personal onboarding.',
    url: 'https://envosta.com/products',
  },
  twitter: {
    title: 'Products — Managed WordPress Hosting on wp.cloud',
    description: 'wp.cloud infrastructure, daily backups, global CDN, free SSL, domain registration, and personal onboarding.',
  },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
