import JSZip from 'jszip';

export type StudioImportResult = {
  projectName: string;
  slug: string;
  styleConfig: any;
  pages: Array<{
    id: string;
    title: string;
    slug: string;
    html: string;
    prompt: string;
    sort_order: number;
  }>;
};

let importIdCounter = 0;
function makeId() { return `import-${++importIdCounter}-${Date.now()}`; }

/** Parse a theme.json string into the studio styleConfig shape. */
export function parseThemeJson(json: string): any {
  const parsed = JSON.parse(json);
  const palette: any[] = parsed?.settings?.color?.palette ?? [];
  const fontFamilies: any[] = parsed?.settings?.typography?.fontFamilies ?? [];

  // Map Assembler theme-1..theme-5 back to our studio color keys
  const bySlug = Object.fromEntries(palette.map((p: any) => [p.slug, p.color]));
  const colors = {
    background: bySlug['theme-1'] || '#FFFFFF',
    surface: bySlug['theme-2'] || '#EEEEEE',
    border: bySlug['theme-3'] || '#BBBBBB',
    textMuted: bySlug['theme-3'] || '#888888',
    primary: bySlug['theme-4'] || '#1E1E1E',
    text: bySlug['theme-4'] || '#1E1E1E',
    secondary: bySlug['theme-4'] || '#1E1E1E',
    accent: bySlug['theme-5'] || '#000000',
  };

  // Extract font names from 'FontName, serif' strings
  const findFont = (slug: string, fallback: string) => {
    const ff = fontFamilies.find((f: any) => f.slug === slug);
    if (!ff?.fontFamily) return fallback;
    const first = String(ff.fontFamily).split(',')[0].trim().replace(/^['"]|['"]$/g, '');
    return first || fallback;
  };
  const fonts = {
    heading: findFont('heading', 'Playfair Display'),
    body: findFont('body', 'Source Sans 3'),
  };

  const borderRadius = parsed?.styles?.elements?.button?.border?.radius || '0';
  const maxWidth = parsed?.settings?.layout?.contentSize || '620px';

  return { colors, fonts, borderRadius, maxWidth };
}

/** Parse a WXR XML export into studio pages. */
export function parseWxrXml(xml: string): StudioImportResult['pages'] {
  if (typeof DOMParser === 'undefined') {
    throw new Error('XML parsing is only available in the browser');
  }
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('Invalid XML: ' + parseError.textContent);

  const items = Array.from(doc.getElementsByTagName('item'));
  const pages: StudioImportResult['pages'] = [];

  items.forEach((item, i) => {
    // Only import pages (not posts, attachments, etc)
    const postType = item.getElementsByTagNameNS('http://wordpress.org/export/1.2/', 'post_type')[0]?.textContent;
    if (postType && postType !== 'page') return;

    const title = item.getElementsByTagName('title')[0]?.textContent?.trim() || `Page ${i + 1}`;
    const slug = item.getElementsByTagNameNS('http://wordpress.org/export/1.2/', 'post_name')[0]?.textContent?.trim()
      || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const menuOrderText = item.getElementsByTagNameNS('http://wordpress.org/export/1.2/', 'menu_order')[0]?.textContent;
    const html = item.getElementsByTagNameNS('http://purl.org/rss/1.0/modules/content/', 'encoded')[0]?.textContent ?? '';

    pages.push({
      id: makeId(),
      title,
      slug,
      html,
      prompt: `${title} page`,
      sort_order: menuOrderText ? Number(menuOrderText) : i,
    });
  });

  pages.sort((a, b) => a.sort_order - b.sort_order);
  return pages;
}

/** Parse the style.css header comment for the theme name. */
function parseStyleCss(css: string): { siteName?: string; slug?: string } {
  const name = css.match(/Theme Name:\s*(.+)/i)?.[1]?.trim();
  const siteName = name ? name.replace(/^Envosta\s*-\s*/i, '') : undefined;
  const slug = css.match(/Text Domain:\s*(.+)/i)?.[1]?.trim().replace(/^envosta-/, '');
  return { siteName, slug };
}

/**
 * Import from a zip file exported by the studio. Returns everything needed
 * to rehydrate a studio session.
 */
export async function importStudioZip(file: File): Promise<StudioImportResult> {
  const zip = await JSZip.loadAsync(file);

  // Locate files in the zip (child theme dir + content xml)
  let themeJson = '';
  let styleCss = '';
  let wxrXml = '';
  let slug = 'imported';

  await Promise.all(
    Object.values(zip.files).map(async (entry) => {
      if (entry.dir) return;
      const name = entry.name.toLowerCase();
      if (name.endsWith('theme.json')) themeJson = await entry.async('string');
      else if (name.endsWith('style.css')) styleCss = await entry.async('string');
      else if (name.endsWith('.xml')) wxrXml = await entry.async('string');
    })
  );

  if (!themeJson && !wxrXml) {
    throw new Error('No theme.json or content XML found in the zip');
  }

  const styleConfig = themeJson ? parseThemeJson(themeJson) : {};
  const { siteName, slug: parsedSlug } = styleCss ? parseStyleCss(styleCss) : {};
  if (parsedSlug) slug = parsedSlug;
  const projectName = siteName || 'Imported Theme';
  if (siteName) styleConfig.siteName = siteName;

  const pages = wxrXml ? parseWxrXml(wxrXml) : [];

  return { projectName, slug, styleConfig, pages };
}

/** Import just an XML file (updates pages only). */
export async function importStudioXml(file: File): Promise<StudioImportResult['pages']> {
  const xml = await file.text();
  return parseWxrXml(xml);
}
