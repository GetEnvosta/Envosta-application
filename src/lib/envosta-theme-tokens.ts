/**
 * Runtime loader for the Envosta parent theme's design tokens.
 *
 * Source of truth: https://github.com/GetEnvosta/Envosta-Theme
 *
 * Strategy:
 *   1. Every call checks the current commit SHA of the configured ref (default
 *      `main`) via api.github.com/repos/.../commits/REF — tiny response.
 *   2. If the SHA matches what we have cached, return cached tokens.
 *   3. If SHA changed (or no cache), fetch theme.json + styles/*.json +
 *      styles/block/*.json + parts/*.html + patterns/*.php from raw.github,
 *      parse, and update the in-memory cache.
 *   4. SHA checks are themselves throttled (default 10 min) so typing in the
 *      studio doesn't hammer GitHub.
 *   5. On any GitHub error we fall back to the last-known cache, then to the
 *      typed hardcoded fallback at the bottom of this file. The studio
 *      degrades to "best guess" instead of crashing.
 *
 * Config env vars (all optional):
 *   ENVOSTA_THEME_REPO   — override "GetEnvosta/Envosta-Theme"
 *   ENVOSTA_THEME_REF    — override "main" (could point at a release tag)
 *   ENVOSTA_GITHUB_TOKEN — PAT for the 5000/hr rate limit (unauth is 60/hr)
 *   ENVOSTA_THEME_WEBHOOK_SECRET — required for /api/studio/theme-tokens
 *                                  POST webhook-based invalidation
 */

const THEME_REPO = process.env.ENVOSTA_THEME_REPO || 'GetEnvosta/Envosta-Theme';
const THEME_REF = process.env.ENVOSTA_THEME_REF || 'main';
const GITHUB_TOKEN = process.env.ENVOSTA_GITHUB_TOKEN;
const SHA_CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const FETCH_TIMEOUT_MS = 8000;

// ─── Types ───────────────────────────────────────────────────────────

export type ColorStop = { slug: string; color: string; name: string };
export type FontFamily = { slug: string; name: string; fontFamily: string };
export type SizedPreset = { slug: string; size: string; name: string };
export type TemplatePart = { name: string; title: string; area: string };
export type CustomTemplate = { name: string; title: string; postTypes: string[] };

export type ThemeVariation = {
  slug: string;         // filename without extension, e.g. "03-ember"
  name: string;         // human name — from the file's "title" or a prettified slug
  palette: ColorStop[]; // the variation's 5-slot override (if any)
  fontFamily?: string;  // primary font family slug if the variation overrides fonts
};

export type BlockStyle = {
  slug: string;  // "section-1"
  name: string;
  title: string;
};

export type ThemePattern = {
  slug: string;               // "envosta/footer"
  title: string;
  categories: string[];
  blockTypes: string[];
  inserter: boolean;          // false = hidden pattern
};

export type EnvostaThemeTokens = {
  sha: string | null;
  repo: string;
  ref: string;
  fetchedAt: number;          // epoch ms the tokens were fetched
  source: 'live' | 'cache-stale' | 'fallback';

  // From theme.json
  themeJson: any | null;
  palette: ColorStop[];
  fontFamilies: FontFamily[];
  fontSizes: SizedPreset[];
  spacingSizes: SizedPreset[];
  contentSize: string;
  wideSize: string;
  templateParts: TemplatePart[];
  customTemplates: CustomTemplate[];

  // From styles/, styles/block/, parts/, patterns/
  variations: ThemeVariation[];
  blockStyles: BlockStyle[];
  patterns: ThemePattern[];
  partSlugs: string[];
};

// ─── Cache ───────────────────────────────────────────────────────────

type CacheEntry = {
  sha: string;
  tokens: EnvostaThemeTokens;
  fetchedAt: number;
};

let cache: CacheEntry | null = null;
let lastShaCheckAt = 0;

// ─── Low-level fetch helpers ─────────────────────────────────────────

function ghHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'EnvostaStudio/1.0',
    Accept: 'application/vnd.github+json',
  };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return headers;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: ghHeaders(),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: ghHeaders(),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function getCurrentSha(): Promise<string | null> {
  const data = await fetchJson<{ sha: string }>(
    `https://api.github.com/repos/${THEME_REPO}/commits/${encodeURIComponent(THEME_REF)}`,
  );
  return data?.sha ?? null;
}

// ─── Token fetcher ───────────────────────────────────────────────────

function prettifyVariationSlug(slug: string): string {
  return slug
    .replace(/^\d+-/, '')     // drop leading sort prefix like "01-"
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function parsePatternHeader(src: string, filenameSlug: string): ThemePattern | null {
  // PHP block-pattern headers live in a /** ... */ docblock at the top of
  // the file. Keys include Title, Slug, Categories, Block Types, Inserter.
  const block = src.match(/\/\*\*([\s\S]*?)\*\//);
  const body = block?.[1] ?? src;
  const title = body.match(/Title:\s*([^\n\r]+)/i)?.[1]?.trim() || filenameSlug;
  const slug = body.match(/Slug:\s*([^\n\r]+)/i)?.[1]?.trim() || `envosta/${filenameSlug}`;
  const cats = (body.match(/Categories:\s*([^\n\r]+)/i)?.[1] ?? '')
    .split(',').map(s => s.trim()).filter(Boolean);
  const types = (body.match(/Block Types:\s*([^\n\r]+)/i)?.[1] ?? '')
    .split(',').map(s => s.trim()).filter(Boolean);
  const inserterRaw = body.match(/Inserter:\s*([^\n\r]+)/i)?.[1]?.trim().toLowerCase();
  const inserter = inserterRaw !== 'no' && inserterRaw !== 'false';
  return { slug, title, categories: cats, blockTypes: types, inserter };
}

async function fetchAllTokens(sha: string): Promise<EnvostaThemeTokens | null> {
  const raw = `https://raw.githubusercontent.com/${THEME_REPO}/${sha}`;
  const api = `https://api.github.com/repos/${THEME_REPO}/contents`;

  // Top-level theme.json + directory listings in parallel.
  const [themeJson, stylesList, blockStylesList, partsList, patternsList] = await Promise.all([
    fetchJson<any>(`${raw}/theme.json`),
    fetchJson<any[]>(`${api}/styles?ref=${encodeURIComponent(sha)}`),
    fetchJson<any[]>(`${api}/styles/block?ref=${encodeURIComponent(sha)}`),
    fetchJson<any[]>(`${api}/parts?ref=${encodeURIComponent(sha)}`),
    fetchJson<any[]>(`${api}/patterns?ref=${encodeURIComponent(sha)}`),
  ]);

  if (!themeJson) return null;

  // Variations — each is a JSON file with its own palette + (optional) fonts.
  const variationFiles = (stylesList || []).filter(f => f?.type === 'file' && typeof f.name === 'string' && f.name.endsWith('.json'));
  const variations = (await Promise.all(
    variationFiles.map(async (f: any) => {
      const doc = await fetchJson<any>(`${raw}/styles/${f.name}`);
      if (!doc) return null;
      const slug = String(f.name).replace(/\.json$/, '');
      const palette: ColorStop[] = (doc?.settings?.color?.palette || []).map((p: any) => ({
        slug: String(p.slug ?? ''),
        color: String(p.color ?? ''),
        name: String(p.name ?? ''),
      }));
      const fontFamily = doc?.settings?.typography?.fontFamilies?.[0]?.slug;
      return {
        slug,
        name: doc?.title ? String(doc.title) : prettifyVariationSlug(slug),
        palette,
        fontFamily: fontFamily ? String(fontFamily) : undefined,
      } satisfies ThemeVariation;
    }),
  )).filter(Boolean) as ThemeVariation[];

  // Block styles (section-1, etc.)
  const blockStyleFiles = (blockStylesList || []).filter(f => f?.type === 'file' && typeof f.name === 'string' && f.name.endsWith('.json'));
  const blockStyles = (await Promise.all(
    blockStyleFiles.map(async (f: any) => {
      const doc = await fetchJson<any>(`${raw}/styles/block/${f.name}`);
      const slug = String(f.name).replace(/\.json$/, '');
      return {
        slug,
        name: slug,
        title: doc?.title ? String(doc.title) : slug,
      } satisfies BlockStyle;
    }),
  )) as BlockStyle[];

  // Parts — just need the filenames for slug awareness.
  const partSlugs = (partsList || [])
    .filter((f: any) => f?.type === 'file' && typeof f.name === 'string' && f.name.endsWith('.html'))
    .map((f: any) => String(f.name).replace(/\.html$/, ''));

  // Patterns — parse the PHP header for slug + categories.
  const patternFiles = (patternsList || []).filter(f => f?.type === 'file' && typeof f.name === 'string' && f.name.endsWith('.php'));
  const patterns = (await Promise.all(
    patternFiles.map(async (f: any) => {
      const src = await fetchText(`${raw}/patterns/${f.name}`);
      if (!src) return null;
      const filenameSlug = String(f.name).replace(/\.php$/, '');
      return parsePatternHeader(src, filenameSlug);
    }),
  )).filter(Boolean) as ThemePattern[];

  const now = Date.now();
  return {
    sha,
    repo: THEME_REPO,
    ref: THEME_REF,
    fetchedAt: now,
    source: 'live',
    themeJson,
    palette: (themeJson?.settings?.color?.palette || []) as ColorStop[],
    fontFamilies: (themeJson?.settings?.typography?.fontFamilies || []).map((f: any) => ({
      slug: String(f.slug ?? ''),
      name: String(f.name ?? f.slug ?? ''),
      fontFamily: String(f.fontFamily ?? ''),
    })),
    fontSizes: (themeJson?.settings?.typography?.fontSizes || []).map((s: any) => ({
      slug: String(s.slug ?? ''),
      size: String(s.size ?? ''),
      name: String(s.name ?? s.slug ?? ''),
    })),
    spacingSizes: (themeJson?.settings?.spacing?.spacingSizes || []).map((s: any) => ({
      slug: String(s.slug ?? ''),
      size: String(s.size ?? ''),
      name: String(s.name ?? s.slug ?? ''),
    })),
    contentSize: String(themeJson?.settings?.layout?.contentSize ?? '620px'),
    wideSize: String(themeJson?.settings?.layout?.wideSize ?? '1440px'),
    templateParts: (themeJson?.templateParts || []).map((p: any) => ({
      name: String(p.name ?? ''),
      title: String(p.title ?? p.name ?? ''),
      area: String(p.area ?? 'uncategorized'),
    })),
    customTemplates: (themeJson?.customTemplates || []).map((t: any) => ({
      name: String(t.name ?? ''),
      title: String(t.title ?? t.name ?? ''),
      postTypes: Array.isArray(t.postTypes) ? t.postTypes.map(String) : [],
    })),
    variations,
    blockStyles,
    patterns,
    partSlugs,
  };
}

// ─── Hardcoded fallback ──────────────────────────────────────────────

/**
 * Typed fallback used only when GitHub is unreachable AND there's no cache.
 * Mirrors the Envosta theme defaults as of the initial inspection. Values
 * here can drift from the real theme — they exist purely so the studio
 * keeps functioning offline / during a GitHub outage.
 */
export const ENVOSTA_THEME_TOKENS_FALLBACK: EnvostaThemeTokens = {
  sha: null,
  repo: THEME_REPO,
  ref: THEME_REF,
  fetchedAt: 0,
  source: 'fallback',
  themeJson: null,
  palette: [
    { slug: 'theme-1', color: '#FFFFFF', name: 'Color 1' },
    { slug: 'theme-2', color: '#EEEEEE', name: 'Color 2' },
    { slug: 'theme-3', color: '#BBBBBB', name: 'Color 3' },
    { slug: 'theme-4', color: '#1E1E1E', name: 'Color 4' },
    { slug: 'theme-5', color: '#000000', name: 'Color 5' },
  ],
  fontFamilies: [
    { slug: 'inter', name: 'Inter', fontFamily: '"Inter", sans-serif' },
  ],
  fontSizes: [
    { slug: 'small',     size: '16px',                            name: 'Small' },
    { slug: 'medium',    size: 'clamp(20px, 2vw, 24px)',          name: 'Medium' },
    { slug: 'large',     size: '38px',                            name: 'Large' },
    { slug: 'x-large',   size: '60px',                            name: 'Extra Large' },
    { slug: 'xx-large',  size: 'clamp(40px, 6vw, 80px)',          name: '2X Large' },
    { slug: 'xxx-large', size: 'clamp(40px, 8vw, 160px)',         name: '3X Large' },
  ],
  spacingSizes: [
    { slug: '20', size: '10px',  name: '2X-Small' },
    { slug: '30', size: '25px',  name: 'X-Small' },
    { slug: '40', size: '50px',  name: 'Small' },
    { slug: '50', size: '75px',  name: 'Medium' },
    { slug: '60', size: '100px', name: 'Large' },
    { slug: '70', size: '125px', name: 'Extra Large' },
    { slug: '80', size: '150px', name: '2X Large' },
  ],
  contentSize: '620px',
  wideSize: '1440px',
  templateParts: [
    { name: 'header', title: 'Header', area: 'header' },
    { name: 'footer', title: 'Footer', area: 'footer' },
  ],
  customTemplates: [],
  variations: [],
  blockStyles: [],
  patterns: [],
  partSlugs: ['header', 'footer'],
};

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Get the current Envosta theme tokens.
 *
 * By default, reuses in-memory cache when the remote SHA hasn't changed
 * since the last check within SHA_CHECK_INTERVAL_MS. Pass forceRefresh to
 * bypass everything and re-fetch.
 */
export async function getEnvostaThemeTokens(
  opts: { forceRefresh?: boolean } = {},
): Promise<EnvostaThemeTokens> {
  const now = Date.now();

  // Fast path — cache fresh and we recently checked SHA.
  if (!opts.forceRefresh && cache && (now - lastShaCheckAt) < SHA_CHECK_INTERVAL_MS) {
    return cache.tokens;
  }

  const currentSha = await getCurrentSha();
  lastShaCheckAt = now;

  if (!currentSha) {
    // GitHub unreachable — degrade gracefully.
    if (cache) {
      return { ...cache.tokens, source: 'cache-stale' };
    }
    return ENVOSTA_THEME_TOKENS_FALLBACK;
  }

  // SHA unchanged — cache is still valid.
  if (!opts.forceRefresh && cache && cache.sha === currentSha) {
    return cache.tokens;
  }

  // Need to refetch.
  const fresh = await fetchAllTokens(currentSha);
  if (fresh) {
    cache = { sha: currentSha, tokens: fresh, fetchedAt: now };
    return fresh;
  }

  // Refetch failed despite GitHub being reachable. Fall back.
  if (cache) return { ...cache.tokens, source: 'cache-stale' };
  return ENVOSTA_THEME_TOKENS_FALLBACK;
}

/** Drop the in-memory cache (webhook / admin refresh). */
export function invalidateEnvostaThemeTokensCache(): void {
  cache = null;
  lastShaCheckAt = 0;
}

/** Introspection for admin UIs. */
export function envostaThemeTokensCacheInfo(): {
  cached: boolean;
  sha: string | null;
  fetchedAt: number | null;
  repo: string;
  ref: string;
} {
  return {
    cached: !!cache,
    sha: cache?.sha ?? null,
    fetchedAt: cache?.fetchedAt ?? null,
    repo: THEME_REPO,
    ref: THEME_REF,
  };
}
