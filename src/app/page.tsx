import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function RootPage() {
  const host = (await headers()).get('host') ?? '';

  // envosta.com → marketing homepage (will be replaced by (marketing) layout once ready)
  if (host === 'envosta.com' || host === 'www.envosta.com') {
    // Rewrite handled by middleware to serve marketing content
    return null;
  }

  // my.envosta.com / localhost → app dashboard
  redirect('/dashboard');
}
