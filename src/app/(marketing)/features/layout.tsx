import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Features | Managed WordPress Hosting',
  description:
    'Explore Envosta features: managed WordPress hosting on wp.cloud, domain registration, Google Workspace email, free migration, global CDN, daily backups, and hands-on onboarding.',
  alternates: { canonical: 'https://envosta.com/features' },
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
