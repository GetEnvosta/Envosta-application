import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Features — Managed WordPress Hosting on wp.cloud',
  description: 'Explore Envosta features: managed WordPress hosting on wp.cloud, domain registration, Google Workspace email, free migration, global CDN, daily backups, and hands-on onboarding.',
  alternates: { canonical: 'https://envosta.com/features' },
  openGraph: {
    title: 'Features — Managed WordPress Hosting on wp.cloud',
    description: 'wp.cloud infrastructure, daily backups, global CDN, free SSL, domain registration, and personal onboarding.',
    url: 'https://envosta.com/features',
  },
  twitter: {
    title: 'Features — Managed WordPress Hosting on wp.cloud',
    description: 'wp.cloud infrastructure, daily backups, global CDN, free SSL, domain registration, and personal onboarding.',
  },
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
