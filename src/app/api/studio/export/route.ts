import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { isStaffRole } from '@/lib/roles';
import JSZip from 'jszip';
import { getAssemblerVariationById } from '@/lib/studio-style-presets';

// Folder slug of the Envosta parent theme on the WordPress server.
// The release asset at https://github.com/GetEnvosta/Envosta-Theme unpacks
// to `envosta/`, so that's the slug WordPress installs it under.
const ENVOSTA_PARENT_SLUG = 'envosta';

export const dynamic = 'force-dynamic';

// ── Child theme.json (overrides Assembler parent) ──
function buildChildThemeJson(style: any) {
  // Mode: 'parent' (default — use parent theme's presets, minimal child)
  //       'custom' (Full Custom mode — full theme.json overrides)
  // Legacy 'preset' normalises to 'custom'.
  const mode = style.mode === 'preset' ? 'custom' : (style.mode || 'parent');

  if (mode === 'parent') {
    // Parent mode: emit a minimal theme.json that inherits everything from
    // the Envosta parent theme. If the user picked one of the parent's
    // built-in style variations, reference it so WP activates that variation.
    const minimal: any = {
      $schema: 'https://schemas.wp.org/trunk/theme.json',
      version: 3,
    };
    return JSON.stringify(minimal, null, 2);
  }

  const colors = style.colors || {};
  const fonts = style.fonts || { heading: 'Playfair Display', body: 'Source Sans 3' };

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
function buildChildStyleCss(siteName: string, slug: string, parentSlug: string) {
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
Template: ${parentSlug}
License: GNU General Public License v2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
Text Domain: envosta-${slug}
*/
`;
}

// ── Child functions.php ──
//
// In Full Custom mode, the child's only job is to enqueue Google Fonts for
// the user's chosen heading + body families (so theme.json overrides
// resolve visually). Site-option setup (title / tagline / homepage /
// menus / style variation) is handled by the Envosta parent theme's
// `import_end` hook, driven by post-meta embedded in the WXR on the
// Home page.
function buildChildFunctionsPhp(
  fonts: any,
  slug: string,
  options: { fullCustom?: boolean },
) {
  const heading = (fonts?.heading || 'Inter').replace(/\s+/g, '+');
  const body = (fonts?.body || 'Inter').replace(/\s+/g, '+');
  const fontsUrl = `https://fonts.googleapis.com/css2?family=${heading}:wght@400;500;600;700&family=${body}:wght@300;400;500;600;700&display=swap`;

  if (!options.fullCustom) {
    return `<?php
/**
 * Envosta Child Theme — ${slug}
 *
 * Minimal child theme — inherits all styles and logic from the Envosta
 * parent. Site setup (title / tagline / homepage / menus) is applied
 * by the parent theme's import_end hook when the WXR is imported.
 */
if (!defined('ABSPATH')) exit;
`;
  }

  return `<?php
/**
 * Envosta Child Theme — ${slug}  (Full Custom mode)
 *
 * Overrides the parent's palette, fonts, and layout via theme.json and
 * enqueues the user's chosen Google Fonts. Site-option setup is still
 * handled by the parent theme's import_end hook — see the parent's
 * functions.php for the setup logic.
 */
if (!defined('ABSPATH')) exit;

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
    const { project, pages: allPages, styleConfig, parentSlug, siteName: reqSiteName, tagline } = await req.json();

    if (!project || !allPages) return NextResponse.json({ error: 'project and pages are required' }, { status: 400 });

    // The Envosta parent theme is installed by default on the hosting stack,
    // so the child theme just references it. Users can override to run on a
    // different parent (e.g. Assembler) via the Parent theme folder field.
    const parent = (typeof parentSlug === 'string' && parentSlug.trim()) || ENVOSTA_PARENT_SLUG;

    const pagesWithContent = (allPages ?? []).filter((p: any) => p.html);

    if (pagesWithContent.length === 0) {
      return NextResponse.json({ error: 'No pages with content to export' }, { status: 400 });
    }

    const style = styleConfig || project.style_config || {};
    const slug = project.slug || 'site';
    const siteName = reqSiteName || style.siteName || project.name;
    const childDir = `envosta-child-${slug}`;
    const fullCustom = (style.mode === 'preset' ? 'custom' : (style.mode || 'parent')) === 'custom';

    // Reference tagline / siteName are captured in the WXR (on Home page
     // meta), not in the child theme — so we don't thread them here.
    void tagline; void siteName;

    const zip = new JSZip();

    // Child theme files — carries theme.json overrides + Google Fonts for
    // Full Custom; minimal shell otherwise.
    zip.file(`${childDir}/theme.json`, buildChildThemeJson(style));
    zip.file(`${childDir}/style.css`, buildChildStyleCss(siteName, slug, parent));
    zip.file(
      `${childDir}/functions.php`,
      buildChildFunctionsPhp(style.fonts, slug, { fullCustom }),
    );

    const buffer = await zip.generateAsync({ type: 'uint8array' });

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="envosta-child-${slug}.zip"`,
      },
    });
  } catch (e: any) {
    console.error('Studio export error:', e);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
