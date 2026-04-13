import type { Metadata } from 'next';
import './generator.css';

export const metadata: Metadata = {
  title: 'Theme Generator — Build a WordPress Child Theme with AI',
  description: 'Use Envosta Studio to generate a complete WordPress FSE child theme and WXR content import file. Describe your site, customize the design, and download a ready-to-install ZIP.',
  alternates: { canonical: 'https://envosta.com/studio/generator' },
  openGraph: {
    title: 'Theme Generator — Build a WordPress Child Theme with AI',
    description: 'Generate a complete WordPress FSE child theme and WXR import file with AI. Describe your site, customize, and download.',
    url: 'https://envosta.com/studio/generator',
  },
  twitter: {
    title: 'Envosta Theme Generator — AI-Powered WordPress Themes',
    description: 'Generate a complete WordPress child theme and content import file with AI.',
  },
};

export default function GeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
