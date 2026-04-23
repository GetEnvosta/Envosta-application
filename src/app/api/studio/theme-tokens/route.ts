import { NextResponse } from 'next/server';
import {
  getEnvostaThemeTokens,
  invalidateEnvostaThemeTokensCache,
  envostaThemeTokensCacheInfo,
} from '@/lib/envosta-theme-tokens';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

/**
 * GET /api/studio/theme-tokens
 *
 * Returns the current Envosta parent theme tokens (palette, fonts, spacing,
 * variations, block styles, patterns, template parts). Server-side routes
 * can import getEnvostaThemeTokens() directly; this endpoint exists for
 * client-side consumers that want the tokens once at session start.
 *
 * Query params:
 *   ?refresh=1 — skip cache and refetch from GitHub
 *   ?info=1    — return just the cache metadata (sha / fetchedAt / repo)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);

  if (url.searchParams.get('info') === '1') {
    return NextResponse.json(envostaThemeTokensCacheInfo(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  try {
    const force = url.searchParams.get('refresh') === '1';
    const tokens = await getEnvostaThemeTokens({ forceRefresh: force });
    return NextResponse.json(tokens, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Failed to load theme tokens' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/studio/theme-tokens
 *
 * Webhook-style invalidation. Point a GitHub webhook (push event) at this
 * URL so every merge to the theme's main branch propagates to the studio
 * within seconds instead of up to 10 minutes (the SHA-check interval).
 *
 * Security: if ENVOSTA_THEME_WEBHOOK_SECRET is set, the caller must pass
 * it in the `x-envosta-webhook-secret` header OR the `secret` query param.
 * If the env var is unset, the endpoint is open — convenient for local dev,
 * not recommended for production. GitHub's native webhook HMAC signing
 * could be added later if you want full-fat auth.
 */
export async function POST(req: Request) {
  const secret = process.env.ENVOSTA_THEME_WEBHOOK_SECRET;
  if (secret) {
    const url = new URL(req.url);
    const provided = req.headers.get('x-envosta-webhook-secret') || url.searchParams.get('secret');
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  invalidateEnvostaThemeTokensCache();
  // Warm the cache immediately so the next request is fast.
  try {
    const tokens = await getEnvostaThemeTokens({ forceRefresh: true });
    return NextResponse.json({ ok: true, sha: tokens.sha, source: tokens.source });
  } catch {
    return NextResponse.json({ ok: true, refreshed: false });
  }
}
