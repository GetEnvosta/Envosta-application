import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { isStaffRole } from '@/lib/roles';
import JSZip from 'jszip';
import { getAssemblerVariationById } from '@/lib/studio-style-presets';

// Folder slug of the Envosta parent theme on the WordPress server.
// Matches the GitHub repo name (case-sensitive) at
// https://github.com/GetEnvosta/Envosta-wordpress-theme.
const ENVOSTA_PARENT_SLUG = 'Envosta-wordpress-theme';

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
// Emits Google Fonts enqueue hooks and a one-shot auto-setup that runs
// after the child theme is activated to configure site title, tagline,
// static homepage, and posts page based on pages imported via WXR.
function buildChildFunctionsPhp(
  fonts: any,
  slug: string,
  options: { siteName?: string; tagline?: string; homePageName?: string; blogPageName?: string; fullCustom?: boolean },
) {
  const heading = (fonts?.heading || 'Inter').replace(/\s+/g, '+');
  const body = (fonts?.body || 'Inter').replace(/\s+/g, '+');
  const fontsUrl = `https://fonts.googleapis.com/css2?family=${heading}:wght@400;500;600;700&family=${body}:wght@300;400;500;600;700&display=swap`;

  // Escape values for PHP single-quoted strings
  const esc = (v: string | undefined | null) => String(v ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const phpSiteName = esc(options.siteName);
  const phpTagline = esc(options.tagline);
  const phpHome = esc(options.homePageName || 'Home');
  const phpBlog = esc(options.blogPageName || 'Blog');

  const fontsBlock = options.fullCustom
    ? `// Enqueue Google Fonts (Full Custom mode — child overrides parent's default fonts)
add_action('wp_enqueue_scripts', function() {
    wp_enqueue_style('envosta-child-fonts', '${fontsUrl}', array(), null);
});

add_action('enqueue_block_editor_assets', function() {
    wp_enqueue_style('envosta-child-fonts-editor', '${fontsUrl}', array(), null);
});
`
    : `// Fonts inherited from the Envosta parent theme.
`;

  return `<?php
/**
 * Envosta Child Theme — ${slug}
 *
 * Handles one-shot WordPress site setup after the child theme is activated:
 *   • Site title + tagline
 *   • Static homepage (Settings → Reading)
 *   • Posts page (if a Blog page exists)
 *   • Assigns the imported Main Menu to the primary location
 *
 * Re-running the setup is idempotent — controlled by a theme-mod flag so
 * manual site-option changes made after setup are never clobbered.
 */

if (!defined('ABSPATH')) exit;

${fontsBlock}
// ── One-shot site setup (runs on first activation) ───────────────────
add_action('after_switch_theme', 'envosta_${slug.replace(/[^a-z0-9]/gi, '_')}_setup');
function envosta_${slug.replace(/[^a-z0-9]/gi, '_')}_setup() {
    if (get_theme_mod('envosta_studio_configured')) return;

    // Site identity
    $site_name = '${phpSiteName}';
    $tagline = '${phpTagline}';
    if ($site_name !== '') update_option('blogname', $site_name);
    if ($tagline !== '') update_option('blogdescription', $tagline);

    // Static homepage (Settings → Reading → A static page)
    $home = get_page_by_title('${phpHome}');
    if ($home instanceof WP_Post) {
        update_option('show_on_front', 'page');
        update_option('page_on_front', $home->ID);
    }
    // Blog / posts page (if the import includes one)
    $blog = get_page_by_title('${phpBlog}');
    if ($blog instanceof WP_Post && (!$home || $blog->ID !== $home->ID)) {
        update_option('page_for_posts', $blog->ID);
    }

    // Assign "Main Menu" (imported via WXR) to the primary nav location.
    $menu = wp_get_nav_menu_object('Main Menu');
    if ($menu) {
        $locations = get_theme_mod('nav_menu_locations');
        if (!is_array($locations)) $locations = array();
        // Cover the common location slugs shipped by Envosta + Assembler.
        foreach (array('primary', 'header-navigation', 'main', 'header') as $loc) {
            $locations[$loc] = $menu->term_id;
        }
        set_theme_mod('nav_menu_locations', $locations);
    }

    // Permalinks — /post-name/ is the most common human-friendly default.
    // Only touch it if it's still the install-time "plain" setting so we
    // don't override an SEO agency's choice.
    if (get_option('permalink_structure') === '') {
        update_option('permalink_structure', '/%postname%/');
    }

    set_theme_mod('envosta_studio_configured', time());
}
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

    // Detect which page titles exist so the setup can point show_on_front /
    // page_for_posts at the right posts on first activation.
    const titles = new Set((allPages || []).map((p: any) => String(p?.title || '').trim()).filter(Boolean));
    const homePageName = titles.has('Home') ? 'Home' : (allPages[0]?.title || 'Home');
    const blogPageName = titles.has('Blog') ? 'Blog' : '';

    const zip = new JSZip();

    // Child theme files — the ZIP is now JUST the theme, ready to upload
    // straight to /wp-content/themes/. The WXR content file is returned
    // separately so users can import it via Tools → Import after the theme
    // is active.
    zip.file(`${childDir}/theme.json`, buildChildThemeJson(style));
    zip.file(`${childDir}/style.css`, buildChildStyleCss(siteName, slug, parent));
    zip.file(
      `${childDir}/functions.php`,
      buildChildFunctionsPhp(style.fonts, slug, {
        siteName,
        tagline: typeof tagline === 'string' ? tagline : '',
        homePageName,
        blogPageName,
        fullCustom,
      }),
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
