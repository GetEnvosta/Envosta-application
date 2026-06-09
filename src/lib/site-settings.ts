import 'server-only';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { SocialLinks } from './social-platforms';

/** Cache tag the admin save route busts after writing social links. */
export const SOCIAL_LINKS_TAG = 'social_links';

/**
 * Brand social links, read by the marketing footer + Organization JSON-LD.
 *
 * Cached + tagged so the footer doesn't hit the DB on every marketing render
 * (and marketing pages stay cacheable). The admin save route calls
 * revalidateTag(SOCIAL_LINKS_TAG) to refresh it immediately on change.
 *
 * Read via the service role — `site_settings` has no anon RLS policy.
 */
export const getSocialLinks = unstable_cache(
  async (): Promise<SocialLinks> => {
    // Never throw — a missing env var or DB blip at build/export time must
    // degrade to "no social links", not crash the whole marketing render.
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SECRET_KEY;
      if (!url || !key) return {};
      const sb = createClient(url, key, { auth: { persistSession: false } });
      const { data } = await sb
        .from('site_settings')
        .select('value')
        .eq('key', 'social_links')
        .maybeSingle();
      return (data?.value ?? {}) as SocialLinks;
    } catch {
      return {};
    }
  },
  ['site-settings:social_links'],
  { tags: [SOCIAL_LINKS_TAG], revalidate: 300 },
);
