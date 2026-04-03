import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  icons: {
    icon: '/assets/Logo/envosta-logo-mark-dark.svg',
    apple: '/assets/Logo/envosta-logo-mark-dark.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ margin: 0, padding: 0, overscrollBehavior: 'none' }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="google" content="notranslate" />
      </head>
      <body style={{ margin: 0, padding: 0, overscrollBehavior: 'none' }}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
