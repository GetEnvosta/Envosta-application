import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../(marketing)/marketing.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://envosta.com'),
  title: {
    template: '%s | Envosta',
    default: 'Envosta — WordPress Hosting Made Simple',
  },
};

export default function StandaloneLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`marketing-site ${inter.variable}`}>
      {children}
    </div>
  );
}
