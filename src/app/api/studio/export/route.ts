import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { isStaffRole } from '@/lib/roles';
import JSZip from 'jszip';

export const dynamic = 'force-dynamic';

// ── Child theme.json (overrides parent) ──
function buildChildThemeJson(style: any) {
  const colors = style.colors || {};
  const fonts = style.fonts || { heading: 'Playfair Display', body: 'Source Sans 3' };

  return JSON.stringify({
    $schema: 'https://schemas.wp.org/trunk/theme.json',
    version: 3,
    settings: {
      color: {
        palette: [
          { slug: 'primary', color: colors.primary || '#1a1a2e', name: 'Primary' },
          { slug: 'primary-light', color: colors.secondary || '#16213e', name: 'Primary Light' },
          { slug: 'cta', color: colors.accent || '#e94560', name: 'CTA' },
          { slug: 'cta-hover', color: colors.accent || '#e94560', name: 'CTA Hover' },
          { slug: 'bg', color: colors.background || '#ffffff', name: 'Background' },
          { slug: 'bg-soft', color: colors.surface || '#f8f8f6', name: 'Background Soft' },
          { slug: 'bg-dark', color: colors.primary || '#111111', name: 'Background Dark' },
          { slug: 'text', color: colors.text || '#1a1a1a', name: 'Text' },
          { slug: 'text-muted', color: colors.textMuted || '#6b6b6b', name: 'Text Muted' },
          { slug: 'text-light', color: '#ffffff', name: 'Text Light' },
          { slug: 'border', color: colors.border || '#e5e5e5', name: 'Border' },
        ],
        custom: false,
      },
      typography: {
        fontFamilies: [
          { fontFamily: `'${fonts.heading}', serif`, slug: 'heading', name: 'Heading' },
          { fontFamily: `'${fonts.body}', sans-serif`, slug: 'body', name: 'Body' },
        ],
        customFontSize: false,
      },
      layout: {
        contentSize: style.maxWidth || '760px',
        wideSize: '1240px',
      },
    },
    styles: {
      color: { background: 'var(--wp--preset--color--bg)', text: 'var(--wp--preset--color--text)' },
      typography: { fontFamily: 'var(--wp--preset--font-family--body)', fontSize: '1rem', lineHeight: '1.7' },
      elements: {
        heading: { typography: { fontFamily: 'var(--wp--preset--font-family--heading)', fontWeight: '600', lineHeight: '1.2' } },
        link: { color: { text: 'var(--wp--preset--color--cta)' }, ':hover': { color: { text: 'var(--wp--preset--color--cta-hover)' } } },
        button: {
          color: { background: 'var(--wp--preset--color--cta)', text: '#ffffff' },
          border: { radius: style.borderRadius || '9999px' },
          typography: { fontFamily: 'var(--wp--preset--font-family--body)', fontWeight: '600' },
        },
      },
    },
  }, null, 2);
}

// ── Child style.css header ──
function buildChildStyleCss(siteName: string, slug: string) {
  return `/*
Theme Name: Envosta - ${siteName}
Theme URI: https://envosta.com
Author: Envosta
Author URI: https://envosta.com
Description: Custom child theme for ${siteName}, built with Envosta Studio
Version: 1.0.0
Requires at least: 6.4
Tested up to: 6.7
Requires PHP: 8.0
Template: envosta-theme
License: GNU General Public License v2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
Text Domain: envosta-${slug}
*/
`;
}

// ── Child functions.php ──
function buildChildFunctionsPhp(fonts: any, slug: string) {
  const heading = (fonts?.heading || 'Playfair Display').replace(/\s+/g, '+');
  const body = (fonts?.body || 'Source Sans 3').replace(/\s+/g, '+');
  const fontsUrl = `https://fonts.googleapis.com/css2?family=${heading}:wght@400;500;600;700&family=${body}:wght@300;400;500;600;700&display=swap`;

  return `<?php
/**
 * Envosta Child Theme - ${slug}
 */

// Enqueue Google Fonts
add_action('wp_enqueue_scripts', function() {
    wp_enqueue_style('envosta-child-fonts', '${fontsUrl}', array(), null);
});

add_action('enqueue_block_editor_assets', function() {
    wp_enqueue_style('envosta-child-fonts-editor', '${fontsUrl}', array(), null);
});
`;
}

// ── WXR XML content export ──
function buildWxrXml(siteName: string, pages: any[]) {
  const now = new Date().toISOString();

  const items = pages.filter(p => p.html).map((page, i) => {
    // Escape CDATA end sequences in content
    const content = (page.html || '').replace(/]]>/g, ']]]]><![CDATA[>');

    return `
    <item>
      <title>${escapeXml(page.title)}</title>
      <link></link>
      <pubDate>${now}</pubDate>
      <dc:creator><![CDATA[admin]]></dc:creator>
      <description></description>
      <content:encoded><![CDATA[${content}]]></content:encoded>
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
    </item>`;
  }).join('\n');

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

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Main export handler ──
export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!isStaffRole(profile?.role)) return NextResponse.json({ error: 'Staff access required' }, { status: 403 });

  try {
    const { project, pages: allPages, styleConfig } = await req.json();
    if (!project || !allPages) return NextResponse.json({ error: 'project and pages are required' }, { status: 400 });

    const pagesWithContent = (allPages ?? []).filter((p: any) => p.html);

    if (pagesWithContent.length === 0) {
      return NextResponse.json({ error: 'No pages with content to export' }, { status: 400 });
    }

    const style = styleConfig || project.style_config || {};
    const slug = project.slug || 'site';
    const siteName = style.siteName || project.name;
    const childDir = `envosta-child-${slug}`;

    const zip = new JSZip();

    // Child theme files
    zip.file(`${childDir}/theme.json`, buildChildThemeJson(style));
    zip.file(`${childDir}/style.css`, buildChildStyleCss(siteName, slug));
    zip.file(`${childDir}/functions.php`, buildChildFunctionsPhp(style.fonts, slug));

    // WXR XML content file
    zip.file(`content-${slug}.xml`, buildWxrXml(siteName, allPages));

    const buffer = await zip.generateAsync({ type: 'uint8array' });

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="envosta-${slug}.zip"`,
      },
    });
  } catch (e: any) {
    console.error('Studio export error:', e);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
