import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Envosta Studio — We Design, Build & Launch Your Website',
  description: 'Custom WordPress design and development handled by our team. Submit a request, we build it. Page design, WooCommerce setup, plugin config, and more from $250 CAD.',
  alternates: { canonical: 'https://envosta.com/studio' },
  openGraph: {
    title: 'Envosta Studio — We Design, Build & Launch Your Website',
    description: 'Custom WordPress design and development from $250 CAD. Submit a request, we build it.',
    url: 'https://envosta.com/studio',
  },
  twitter: {
    title: 'Envosta Studio — Custom WordPress Design & Development',
    description: 'Submit a request, we build it. Page design, WooCommerce, plugins, and more from $250 CAD.',
  },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
