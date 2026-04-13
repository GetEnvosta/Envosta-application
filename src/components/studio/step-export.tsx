'use client';

import { useState } from 'react';
import { Download, Folder, FileText, FileCode, Loader2, Check, AlertCircle } from 'lucide-react';

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
function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildWxrXml(siteName: string, pages: any[]) {
  const now = new Date().toISOString();

  const items = pages.filter(p => p.html).map((page, i) => {
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

export function StepExport({
  projectId, project, styleConfig, pages, onAuthRequired,
}: {
  projectId: string;
  project: any;
  styleConfig: any;
  pages: any[];
  onAuthRequired?: () => void;
}) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const slug = project.slug || 'site';
  const pagesWithContent = pages.filter(p => p.html);

  async function handleExport() {
    // Check auth before allowing download
    if (onAuthRequired) {
      try {
        const check = await fetch('/api/usage', { method: 'GET' });
        if (check.status === 401) { onAuthRequired(); return; }
      } catch {
        // If auth check fails, still try the export (offline-friendly)
      }
    }

    setExporting(true);
    setError('');
    try {
      // Dynamic import JSZip for client-side ZIP generation
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      const style = styleConfig || {};
      const siteName = style.siteName || project.name;
      const childDir = `envosta-child-${slug}`;

      // Child theme files
      zip.file(`${childDir}/theme.json`, buildChildThemeJson(style));
      zip.file(`${childDir}/style.css`, buildChildStyleCss(siteName, slug));
      zip.file(`${childDir}/functions.php`, buildChildFunctionsPhp(style.fonts, slug));

      // WXR XML content file
      zip.file(`content-${slug}.xml`, buildWxrXml(siteName, pages));

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `envosta-${slug}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('Export failed — please try again');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex items-start justify-center min-h-full p-8">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Ready to Export</h2>
          <p className="text-sm text-gray-500">{pagesWithContent.length} pages ready. Download the child theme and WXR import file.</p>
        </div>

        {/* File tree */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 font-mono text-xs text-gray-600">
          <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
            <Folder className="w-3.5 h-3.5 text-amber-500" /> envosta-child-{slug}/
          </div>
          <div className="ml-5 space-y-1">
            <div className="flex items-center gap-2"><FileCode className="w-3 h-3 text-blue-500" /> theme.json <span className="text-gray-400 font-sans">(overrides parent colors, fonts)</span></div>
            <div className="flex items-center gap-2"><FileText className="w-3 h-3 text-gray-400" /> style.css <span className="text-gray-400 font-sans">(child theme header → Template: envosta-theme)</span></div>
            <div className="flex items-center gap-2"><FileCode className="w-3 h-3 text-purple-500" /> functions.php <span className="text-gray-400 font-sans">(Google Fonts, patterns)</span></div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-gray-900 font-semibold">
            <FileCode className="w-3.5 h-3.5 text-green-500" /> content-{slug}.xml <span className="text-gray-400 font-sans font-normal">(WXR import — {pagesWithContent.length} pages)</span>
          </div>
        </div>

        {/* Pages included */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Pages in Export</h3>
          <div className="space-y-1">
            {pages.map(page => (
              <div key={page.id} className="flex items-center gap-2 text-sm">
                {page.html ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <AlertCircle className="w-3.5 h-3.5 text-gray-300" />}
                <span className={page.html ? 'text-gray-700' : 'text-gray-400'}>{page.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Download */}
        <div className="text-center">
          <button
            onClick={handleExport}
            disabled={exporting || pagesWithContent.length === 0}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Generating...' : 'Download ZIP'}
          </button>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>

        {/* Deployment instructions */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Deployment to wp.cloud</h4>
          <ol className="text-xs text-blue-800 space-y-2 list-decimal list-inside">
            <li>Ensure the <strong>Envosta Parent Theme</strong> is installed and active on the WordPress site</li>
            <li>Upload the <code className="bg-blue-100 px-1 rounded">envosta-child-{slug}</code> folder to <code className="bg-blue-100 px-1 rounded">wp-content/themes/</code></li>
            <li>Activate the child theme in <strong>Appearance → Themes</strong></li>
            <li>Go to <strong>Tools → Import → WordPress</strong> and upload <code className="bg-blue-100 px-1 rounded">content-{slug}.xml</code></li>
            <li>Set the homepage in <strong>Settings → Reading → A static page</strong></li>
          </ol>
        </div>
      </div>
    </div>
  );
}
