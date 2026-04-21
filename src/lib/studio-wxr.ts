/**
 * WordPress WXR (eXtended RSS) builder for studio exports.
 * Isomorphic — safe to use on client or server (pure string manipulation).
 */

export type WxrPage = {
  title: string;
  slug: string;
  html?: string | null;
};

/**
 * Site-level settings carried inside the WXR as post_meta on the Home page.
 * The Envosta parent theme picks these up on `import_end` and applies them
 * to site options (blogname / blogdescription / show_on_front /
 * page_on_front / page_for_posts / nav_menu_locations).
 *
 * Each key is prefixed with `_envosta_` so nothing else on the site collides
 * with it, and they're all deleted by the parent after being consumed.
 */
export type WxrSiteSettings = {
  siteName?: string;
  tagline?: string;
  homePageTitle?: string;  // defaults to "Home"
  blogPageTitle?: string;  // if a blog page exists
  styleVariation?: string; // e.g. "03-ember" — parent theme activates via set_theme_mod
  menuName?: string;       // defaults to "Main Menu"
};

/** Pages whose titles are template parts — excluded from pages and the menu. */
const TEMPLATE_PART_TITLES = new Set(['Header', 'Footer']);

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function encodeCdata(str: string): string {
  // Escape any CDATA-terminator sequences so we can safely wrap in <![CDATA[...]]>
  return String(str ?? '').replace(/]]>/g, ']]]]><![CDATA[>');
}

function slugify(input: string): string {
  return (input || 'menu').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'menu';
}

/**
 * PHP serialise a simple array of strings. WordPress stores
 * `_menu_item_classes` as a serialised PHP array (`a:1:{i:0;s:0:"";}`).
 * This only handles the case we need: an array of N strings.
 */
function phpSerializeStringArray(arr: string[]): string {
  const parts = arr.map((s, i) => `i:${i};s:${s.length}:"${s}";`).join('');
  return `a:${arr.length}:{${parts}}`;
}

function menuItemPostmeta(meta: Record<string, string>): string {
  return Object.entries(meta)
    .map(([k, v]) => `
      <wp:postmeta>
        <wp:meta_key>${escapeXml(k)}</wp:meta_key>
        <wp:meta_value><![CDATA[${encodeCdata(v)}]]></wp:meta_value>
      </wp:postmeta>`)
    .join('');
}

/**
 * Build a WXR XML document from an array of pages with HTML content.
 * Also emits a nav_menu term + nav_menu_item entries so WordPress shows
 * an actual "Main Menu" under Appearance → Menus on import, containing
 * one link per content page (template parts like Header/Footer excluded).
 *
 * Pages without html are still included as menu entries if they have a
 * title and slug, but they won't produce a <page> post — on import those
 * menu items will orphan unless the target page exists. Simpler to skip
 * them entirely to keep menu items consistent with what's actually there.
 */
export function buildWxrXml(
  siteName: string,
  pages: WxrPage[],
  opts: { menuName?: string; includeMenu?: boolean; siteSettings?: WxrSiteSettings } = {},
): string {
  const now = new Date().toISOString();
  const includeMenu = opts.includeMenu ?? true;
  const menuName = opts.menuName || opts.siteSettings?.menuName || 'Main Menu';
  const menuSlug = slugify(menuName);
  const siteSettings = opts.siteSettings;
  const homeTitle = siteSettings?.homePageTitle || 'Home';

  // Content pages (excluding template parts) become WP page posts.
  const contentPages = pages.filter(p => p.html && !TEMPLATE_PART_TITLES.has(p.title));
  const pageItems = contentPages.map((page, i) => {
    const postId = i + 10;
    // Site-settings post-meta rides on the Home page item. The parent
    // theme's import_end hook reads + applies them + cleans them up.
    const isHome = siteSettings && page.title === homeTitle;
    const settingMeta: Array<[string, string]> = [];
    if (isHome) {
      if (siteSettings!.siteName)        settingMeta.push(['_envosta_site_title',     siteSettings!.siteName!]);
      if (siteSettings!.tagline)         settingMeta.push(['_envosta_site_tagline',   siteSettings!.tagline!]);
      if (siteSettings!.homePageTitle)   settingMeta.push(['_envosta_home_title',     siteSettings!.homePageTitle!]);
      if (siteSettings!.blogPageTitle)   settingMeta.push(['_envosta_blog_title',     siteSettings!.blogPageTitle!]);
      if (siteSettings!.styleVariation)  settingMeta.push(['_envosta_style_variation', siteSettings!.styleVariation!]);
      if (siteSettings!.menuName)        settingMeta.push(['_envosta_menu_name',      siteSettings!.menuName!]);
      // Sentinel — parent theme looks for this to know it should run setup.
      settingMeta.push(['_envosta_pending_setup', '1']);
    }
    const metaBlock = settingMeta.length
      ? settingMeta.map(([k, v]) => `
      <wp:postmeta>
        <wp:meta_key>${escapeXml(k)}</wp:meta_key>
        <wp:meta_value><![CDATA[${encodeCdata(v)}]]></wp:meta_value>
      </wp:postmeta>`).join('')
      : '';

    return `
    <item>
      <title>${escapeXml(page.title)}</title>
      <link></link>
      <pubDate>${now}</pubDate>
      <dc:creator><![CDATA[admin]]></dc:creator>
      <guid isPermaLink="false">https://example.com/?page_id=${postId}</guid>
      <description></description>
      <content:encoded><![CDATA[${encodeCdata(page.html || '')}]]></content:encoded>
      <excerpt:encoded><![CDATA[]]></excerpt:encoded>
      <wp:post_id>${postId}</wp:post_id>
      <wp:post_date>${now}</wp:post_date>
      <wp:post_date_gmt>${now}</wp:post_date_gmt>
      <wp:post_modified>${now}</wp:post_modified>
      <wp:post_modified_gmt>${now}</wp:post_modified_gmt>
      <wp:comment_status>closed</wp:comment_status>
      <wp:ping_status>closed</wp:ping_status>
      <wp:post_name>${escapeXml(page.slug)}</wp:post_name>
      <wp:status>publish</wp:status>
      <wp:post_parent>0</wp:post_parent>
      <wp:menu_order>${i}</wp:menu_order>
      <wp:post_type>page</wp:post_type>
      <wp:is_sticky>0</wp:is_sticky>${metaBlock}
    </item>`;
  });

  // Build menu term + menu items. Menu items are posts of type
  // nav_menu_item linked to the nav_menu taxonomy term.
  let menuTermBlock = '';
  let menuItemBlocks: string[] = [];
  if (includeMenu && contentPages.length > 0) {
    menuTermBlock = `
    <wp:term>
      <wp:term_id>2</wp:term_id>
      <wp:term_taxonomy>nav_menu</wp:term_taxonomy>
      <wp:term_slug>${escapeXml(menuSlug)}</wp:term_slug>
      <wp:term_parent></wp:term_parent>
      <wp:term_name><![CDATA[${encodeCdata(menuName)}]]></wp:term_name>
    </wp:term>`;

    menuItemBlocks = contentPages.map((page, i) => {
      const menuItemPostId = 1000 + i; // non-overlapping id space
      const pagePostId = i + 10;
      return `
    <item>
      <title>${escapeXml(page.title)}</title>
      <link></link>
      <pubDate>${now}</pubDate>
      <dc:creator><![CDATA[admin]]></dc:creator>
      <guid isPermaLink="false">https://example.com/?p=${menuItemPostId}</guid>
      <description></description>
      <content:encoded><![CDATA[]]></content:encoded>
      <excerpt:encoded><![CDATA[]]></excerpt:encoded>
      <wp:post_id>${menuItemPostId}</wp:post_id>
      <wp:post_date>${now}</wp:post_date>
      <wp:post_date_gmt>${now}</wp:post_date_gmt>
      <wp:post_modified>${now}</wp:post_modified>
      <wp:post_modified_gmt>${now}</wp:post_modified_gmt>
      <wp:comment_status>closed</wp:comment_status>
      <wp:ping_status>closed</wp:ping_status>
      <wp:post_name>${escapeXml(page.slug)}-menu-item</wp:post_name>
      <wp:status>publish</wp:status>
      <wp:post_parent>0</wp:post_parent>
      <wp:menu_order>${i + 1}</wp:menu_order>
      <wp:post_type>nav_menu_item</wp:post_type>
      <wp:is_sticky>0</wp:is_sticky>
      <category domain="nav_menu" nicename="${escapeXml(menuSlug)}"><![CDATA[${encodeCdata(menuName)}]]></category>${menuItemPostmeta({
        '_menu_item_type': 'post_type',
        '_menu_item_menu_item_parent': '0',
        '_menu_item_object_id': String(pagePostId),
        '_menu_item_object': 'page',
        '_menu_item_target': '',
        '_menu_item_classes': phpSerializeStringArray(['']),
        '_menu_item_xfn': '',
        '_menu_item_url': '',
      })}
    </item>`;
    });
  }

  const allItems = [...pageItems, ...menuItemBlocks].join('\n');

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/"
>
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>https://example.com</link>
    <description>${escapeXml(siteName)} — Built with Envosta Studio</description>
    <language>en-US</language>
    <wp:wxr_version>1.2</wp:wxr_version>
    <wp:base_site_url>https://example.com</wp:base_site_url>
    <wp:base_blog_url>https://example.com</wp:base_blog_url>

    <wp:author>
      <wp:author_id>1</wp:author_id>
      <wp:author_login><![CDATA[admin]]></wp:author_login>
      <wp:author_email><![CDATA[admin@envosta.com]]></wp:author_email>
      <wp:author_display_name><![CDATA[Admin]]></wp:author_display_name>
    </wp:author>${menuTermBlock}
${allItems}
  </channel>
</rss>`;
}

/** Trigger a browser download for a single page as a WXR XML file. */
export function downloadPageAsXml(siteName: string, page: WxrPage): void {
  if (typeof window === 'undefined') return;
  // Single-page export doesn't include the menu (it's just one item).
  const xml = buildWxrXml(siteName, [page], { includeMenu: false });
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${page.slug || 'page'}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
