/**
 * WordPress WXR (eXtended RSS) builder for studio exports.
 * Isomorphic — safe to use on client or server (pure string manipulation).
 */

export type WxrPage = {
  title: string;
  slug: string;
  html?: string | null;
};

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

/**
 * Build a WXR XML document from an array of pages with HTML content.
 * Pages without html are skipped. Designed for WordPress > Tools > Import.
 */
export function buildWxrXml(siteName: string, pages: WxrPage[]): string {
  const now = new Date().toISOString();

  const items = pages
    .filter(p => p.html)
    .map((page, i) => `
    <item>
      <title>${escapeXml(page.title)}</title>
      <link></link>
      <pubDate>${now}</pubDate>
      <dc:creator><![CDATA[admin]]></dc:creator>
      <description></description>
      <content:encoded><![CDATA[${encodeCdata(page.html || '')}]]></content:encoded>
      <excerpt:encoded><![CDATA[]]></excerpt:encoded>
      <wp:post_id>${i + 10}</wp:post_id>
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
      <wp:is_sticky>0</wp:is_sticky>
    </item>`)
    .join('\n');

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
    </wp:author>
${items}
  </channel>
</rss>`;
}

/** Trigger a browser download for a single page as a WXR XML file. */
export function downloadPageAsXml(siteName: string, page: WxrPage): void {
  if (typeof window === 'undefined') return;
  const xml = buildWxrXml(siteName, [page]);
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
