import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { isStaffRole } from '@/lib/roles';
import JSZip from 'jszip';
import { buildWxrXml } from '@/lib/studio-wxr';

export const dynamic = 'force-dynamic';

// ── Child theme.json (overrides Assembler parent) ──
function buildChildThemeJson(style: any) {
  const colors = style.colors || {};
  const fonts = style.fonts || { heading: 'Playfair Display', body: 'Source Sans 3' };
  const mode = style.mode === 'preset' ? 'custom' : (style.mode || 'custom');

  // Parent mode: emit a minimal theme.json that does NOT override the parent
  // theme's palette, typography, or layout. This lets Assembler's defaults apply.
  if (mode === 'parent') {
    return JSON.stringify({
      $schema: 'https://schemas.wp.org/trunk/theme.json',
      version: 3,
    }, null, 2);
  }

  return JSON.stringify({
    $schema: 'https://schemas.wp.org/trunk/theme.json',
    version: 3,
    settings: {
      color: {
        defaultPalette: false,
        defaultGradients: false,
        palette: [
          { slug: 'theme-1', color: colors.background || '#FFFFFF', name: 'Color 1' },
          { slug: 'theme-2', color: colors.surface || '#EEEEEE', name: 'Color 2' },
          { slug: 'theme-3', color: colors.border || colors.textMuted || '#BBBBBB', name: 'Color 3' },
          { slug: 'theme-4', color: colors.primary || colors.text || '#1E1E1E', name: 'Color 4' },
          { slug: 'theme-5', color: colors.accent || '#000000', name: 'Color 5' },
        ],
      },
      typography: {
        fontFamilies: [
          { fontFamily: `'${fonts.heading}', serif`, slug: 'heading', name: 'Heading' },
          { fontFamily: `'${fonts.body}', sans-serif`, slug: 'body', name: 'Body' },
        ],
      },
      layout: {
        contentSize: style.maxWidth || '620px',
        wideSize: '1440px',
      },
    },
    styles: {
      color: {
        background: 'var(--wp--preset--color--theme-1)',
        text: 'var(--wp--preset--color--theme-4)',
      },
      typography: {
        fontFamily: 'var(--wp--preset--font-family--body)',
        fontSize: '16px',
        lineHeight: '1.65',
      },
      elements: {
        heading: {
          typography: {
            fontFamily: 'var(--wp--preset--font-family--heading)',
            fontWeight: '500',
          },
        },
        link: {
          color: { text: 'currentColor' },
        },
        button: {
          color: {
            background: 'var(--wp--preset--color--theme-4)',
            text: 'var(--wp--preset--color--theme-1)',
          },
          border: { radius: style.borderRadius || '0' },
          typography: {
            fontFamily: 'var(--wp--preset--font-family--heading)',
            fontSize: 'var(--wp--preset--font-size--small)',
            fontWeight: '450',
          },
          spacing: {
            padding: { top: '16px', bottom: '16px', left: '24px', right: '24px' },
          },
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
Template: assembler
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
 * Envosta Child Theme (Assembler) - ${slug}
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

// buildWxrXml now lives in @/lib/studio-wxr (isomorphic)

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
