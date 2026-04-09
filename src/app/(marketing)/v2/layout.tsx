import { Inter } from 'next/font/google';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import './marketing-v2.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`marketing-site ${inter.variable}`}>
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
