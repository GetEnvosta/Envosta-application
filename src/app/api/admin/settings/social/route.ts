/**
 * POST /api/admin/settings/social — admin: save the brand's social-media links.
 *
 * Body: { links: { [platformKey]: url } }
 * Upserts site_settings['social_links'] with the cleaned, validated map and
 * busts the cached footer read (revalidateTag). Admin only.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag } from 'next/cache';
import { isAdminRole } from '@/lib/roles';
import { recordAudit } from '@/lib/audit';
import { SOCIAL_PLATFORMS, type SocialKey } from '@/lib/social-platforms';
import { SOCIAL_LINKS_TAG } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';

const VALID_KEYS = new Set<string>(SOCIAL_PLATFORMS.map((p) => p.key));

export async function POST(req: Request) {
  const jar = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => jar.getAll(), setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).maybeSingle();
  if (!isAdminRole(profile?.role)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const inputLinks = (body?.links ?? {}) as Record<string, unknown>;

  // Validate: known platform keys only, full http(s) URLs, blanks dropped.
  const cleaned: Partial<Record<SocialKey, string>> = {};
  for (const [k, v] of Object.entries(inputLinks)) {
    if (!VALID_KEYS.has(k)) continue;
    if (typeof v !== 'string') continue;
    const url = v.trim();
    if (!url) continue; // empty = remove that platform
    if (url.length > 500 || !/^https?:\/\/\S+\.\S+/i.test(url)) {
      return NextResponse.json(
        { error: `Invalid URL for ${k} — use a full link like https://…` },
        { status: 400 },
      );
    }
    cleaned[k as SocialKey] = url;
  }

  const { error } = await sb.from('site_settings').upsert(
    { key: 'social_links', value: cleaned, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateTag(SOCIAL_LINKS_TAG);

  await recordAudit({
    actorId: user.id,
    actorType: 'admin',
    action: 'settings.social.updated',
    resourceType: 'site_settings',
    resourceId: 'social_links',
    metadata: { platforms: Object.keys(cleaned) },
  });

  return NextResponse.json({ ok: true, links: cleaned });
}
