import { NextResponse } from 'next/server';
import {
  getEnvostaThemeTokens,
  invalidateEnvostaThemeTokensCache,
} from '@/lib/envosta-theme-tokens';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

/**
 * GET /api/studio/theme-tokens
 * Returns the current Envosta parent theme tokens.
 * ?refresh=1 skips the cache and re-fetches from GitHub.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get('refresh') === '1';
  try {
    const tokens = await getEnvostaThemeTokens({ forceRefresh: force });
    return NextResponse.json(tokens, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Failed to load theme tokens' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/studio/theme-tokens
 * Clears the in-memory cache and warms it. Point a GitHub push webhook
 * here if you want instant propagation (otherwise the SHA check picks up
 * changes within 10 minutes). No auth — the endpoint only triggers a
 * cache refresh, which costs a handful of GitHub requests at worst.
 */
export async function POST() {
  invalidateEnvostaThemeTokensCache();
  try {
    const tokens = await getEnvostaThemeTokens({ forceRefresh: true });
    return NextResponse.json({ ok: true, sha: tokens.sha });
  } catch {
    return NextResponse.json({ ok: true, refreshed: false });
  }
}
