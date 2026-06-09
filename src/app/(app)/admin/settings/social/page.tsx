/**
 * Settings → Social. Edit the brand's social-media URLs. These render in the
 * marketing footer (and feed the Organization JSON-LD sameAs for SEO).
 * Reads live (uncached) so an admin always sees the current stored values.
 */
import { createClient } from '@supabase/supabase-js';
import type { SocialLinks } from '@/lib/social-platforms';
import { SocialForm } from './social-form';

export const dynamic = 'force-dynamic';

export default async function SocialSettingsPage() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const { data } = await sb
    .from('site_settings')
    .select('value')
    .eq('key', 'social_links')
    .maybeSingle();
  const links = (data?.value ?? {}) as SocialLinks;

  return (
    <div className="card p-6 max-w-2xl">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">Social media links</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Add your profile URLs. Icons appear in the site footer (and feed your SEO profile) —
          any platform left blank is hidden.
        </p>
      </div>
      <SocialForm initial={links} />
    </div>
  );
}
