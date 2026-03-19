import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function Home() {
  const host = (await headers()).get('host') ?? '';

  // On envosta.com, don't redirect — let middleware serve the static page
  if (host === 'envosta.com' || host === 'www.envosta.com') {
    return null;
  }

  redirect('/dashboard');
}
