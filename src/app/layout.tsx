import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Envosta — WordPress Hosting Made Simple',
  description: 'Enterprise-grade WordPress hosting powered by WP.cloud infrastructure.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
