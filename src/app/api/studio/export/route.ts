import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { isStaffRole } from '@/lib/roles';
import JSZip from 'jszip';

export const dynamic = 'force-dynamic';

// ── WordPress theme.json generator ──
function buildThemeJson(style: any, slug: string) {
  const colors = style.colors || {};
  const fonts = style.fonts || { heading: 'Playfair Display', body: 'Source Sans 3' };

  return JSON.stringify({
    $schema: 'https://schemas.wp.org/trunk/theme.json',
    version: 3,
    settings: {
      appearanceTools: true,
      color: {
        palette: [
          { slug: 'primary', color: colors.primary || '#1a1a2e', name: 'Primary' },
          { slug: 'secondary', color: colors.secondary || '#16213e', name: 'Secondary' },
          { slug: 'accent', color: colors.accent || '#e94560', name: 'Accent' },
          { slug: 'background', color: colors.background || '#0f0f1a', name: 'Background' },
          { slug: 'surface', color: colors.surface || '#1a1a2e', name: 'Surface' },
          { slug: 'text', color: colors.text || '#e8e8e8', name: 'Text' },
          { slug: 'text-muted', color: colors.textMuted || '#8a8a9a', name: 'Text Muted' },
          { slug: 'border', color: colors.border || '#2a2a3e', name: 'Border' },
        ],
      },
      typography: {
        fontFamilies: [
          { fontFamily: `'${fonts.heading}', serif`, slug: 'heading', name: 'Heading' },
          { fontFamily: `'${fonts.body}', sans-serif`, slug: 'body', name: 'Body' },
        ],
        fontSizes: [
          { slug: 'small', size: '0.875rem', name: 'Small' },
          { slug: 'medium', size: '1rem', name: 'Medium' },
          { slug: 'large', size: '1.25rem', name: 'Large' },
          { slug: 'x-large', size: '1.75rem', name: 'X-Large' },
          { slug: '2x-large', size: '2.5rem', name: '2X-Large' },
          { slug: '3x-large', size: '3.5rem', name: '3X-Large' },
        ],
      },
      layout: {
        contentSize: style.maxWidth || '1200px',
        wideSize: '1400px',
      },
      spacing: {
        units: ['px', 'em', 'rem', 'vh', 'vw', '%'],
      },
    },
    styles: {
      color: {
        background: colors.background || '#0f0f1a',
        text: colors.text || '#e8e8e8',
      },
      typography: {
        fontFamily: `'${fonts.body}', sans-serif`,
        fontSize: '1rem',
        lineHeight: '1.7',
      },
      elements: {
        heading: {
          typography: {
            fontFamily: `'${fonts.heading}', serif`,
            fontWeight: '600',
            lineHeight: '1.2',
          },
        },
        link: {
          color: { text: colors.accent || '#e94560' },
          ':hover': { color: { text: colors.primary || '#1a1a2e' } },
        },
        button: {
          color: { background: colors.accent || '#e94560', text: '#ffffff' },
          border: { radius: style.borderRadius || '4px' },
          typography: { fontFamily: `'${fonts.body}', sans-serif`, fontWeight: '600', fontSize: '0.9rem' },
        },
      },
    },
  }, null, 2);
}

// ── WordPress style.css header ──
function buildStyleCss(siteName: string, slug: string) {
  return `/*
Theme Name: Envosta - ${siteName}
Theme URI: https://envosta.com
Author: Envosta
Author URI: https://envosta.com
Description: Custom FSE theme built with Envosta Studio
Version: 1.0.0
Requires at least: 6.4
Tested up to: 6.7
Requires PHP: 8.0
License: GNU General Public License v2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
Text Domain: envosta-${slug}
*/
`;
}

// ── functions.php ──
function buildFunctionsPhp(fonts: any, slug: string) {
  const heading = (fonts?.heading || 'Playfair Display').replace(/\s+/g, '+');
  const body = (fonts?.body || 'Source Sans 3').replace(/\s+/g, '+');
  const fontsUrl = `https://fonts.googleapis.com/css2?family=${heading}:wght@400;500;600;700&family=${body}:wght@300;400;500;600;700&display=swap`;

  return `<?php
/**
 * Envosta - ${slug} Theme Functions
 */

// Enqueue Google Fonts
add_action('wp_enqueue_scripts', function() {
    wp_enqueue_style('envosta-google-fonts', '${fontsUrl}', array(), null);
});

add_action('enqueue_block_editor_assets', function() {
    wp_enqueue_style('envosta-google-fonts-editor', '${fontsUrl}', array(), null);
});

// Register block pattern category
add_action('init', function() {
    register_block_pattern_category('envosta-pages', array(
        'label' => __('Envosta Pages', 'envosta-${slug}')
    ));
});
`;
}

// ── FSE templates (block markup) ──
function buildTemplate(type: 'index' | 'front-page' | 'page') {
  return `<!-- wp:template-part {"slug":"header","area":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
    <!-- wp:post-content /-->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","area":"footer"} /-->
`;
}

function buildHeaderPart(siteName: string) {
  return `<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
    <!-- wp:group {"layout":{"type":"flex","justifyContent":"space-between","flexWrap":"wrap"}} -->
    <div class="wp-block-group">
        <!-- wp:site-title /-->
        <!-- wp:navigation /-->
    </div>
    <!-- /wp:group -->
</div>
<!-- /wp:group -->
`;
}

function buildFooterPart(siteName: string) {
  const year = new Date().getFullYear();
  return `<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
    <!-- wp:paragraph {"align":"center","fontSize":"small"} -->
    <p class="has-text-align-center has-small-font-size">&copy; ${year} ${siteName}. All rights reserved.</p>
    <!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
`;
}

// ── Import plugin PHP ──
function buildImportPlugin(siteName: string, slug: string, pages: any[]) {
  const pagesPhp = pages.filter(p => p.html).map((page, i) => {
    const escaped = page.html.replace(/'/g, "\\'").replace(/\\/g, '\\\\');
    const isHome = i === 0;
    return `
    // Page: ${page.title}
    $page_id = wp_insert_post(array(
        'post_title'   => '${page.title.replace(/'/g, "\\'")}',
        'post_name'    => '${page.slug}',
        'post_content' => '${escaped}',
        'post_status'  => 'publish',
        'post_type'    => 'page',
    ));
    $page_ids[] = $page_id;
    ${isHome ? `
    // Set as homepage
    update_option('page_on_front', $page_id);
    update_option('show_on_front', 'page');
    ` : ''}
    $menu_items[] = array('title' => '${page.title.replace(/'/g, "\\'")}', 'page_id' => $page_id);`;
  }).join('\n');

  return `<?php
/**
 * Plugin Name: Envosta Import - ${siteName}
 * Description: Imports pages and navigation for the ${siteName} website. Activate, click "Import Now", then deactivate and delete.
 * Version: 1.0.0
 * Author: Envosta
 */

if (!defined('ABSPATH')) exit;

// Show import button
add_action('admin_notices', function() {
    if (get_option('envosta_import_${slug}_done')) {
        echo '<div class="notice notice-success"><p><strong>Envosta Import:</strong> Pages imported successfully! You can deactivate and delete this plugin.</p></div>';
        return;
    }
    $url = admin_url('admin-post.php?action=envosta_import_${slug}');
    echo '<div class="notice notice-info"><p><strong>Envosta Import:</strong> Ready to import ${pages.filter(p => p.html).length} pages. <a href="' . esc_url($url) . '" class="button button-primary">Import Now</a></p></div>';
});

// Handle import
add_action('admin_post_envosta_import_${slug}', function() {
    if (!current_user_can('manage_options')) wp_die('Unauthorized');
    if (get_option('envosta_import_${slug}_done')) {
        wp_redirect(admin_url());
        exit;
    }

    $page_ids = array();
    $menu_items = array();
${pagesPhp}

    // Create navigation menu
    $menu_id = wp_create_nav_menu('${siteName} Navigation');
    if (!is_wp_error($menu_id)) {
        foreach ($menu_items as $item) {
            wp_update_nav_menu_item($menu_id, 0, array(
                'menu-item-title'     => $item['title'],
                'menu-item-object'    => 'page',
                'menu-item-object-id' => $item['page_id'],
                'menu-item-type'      => 'post_type',
                'menu-item-status'    => 'publish',
            ));
        }
    }

    update_option('envosta_import_${slug}_done', true);
    wp_redirect(admin_url('edit.php?post_type=page'));
    exit;
});
`;
}

export async function POST(req: Request) {
  // Auth
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!isStaffRole(profile?.role)) {
    return NextResponse.json({ error: 'Staff access required' }, { status: 403 });
  }

  try {
    const { projectId } = await req.json();
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    // Fetch project + pages
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { data: project } = await sb.from('studio_projects').select('*').eq('id', projectId).single();
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const { data: pages } = await sb
      .from('studio_pages')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });

    const allPages = pages ?? [];
    const pagesWithContent = allPages.filter(p => p.html);

    if (pagesWithContent.length === 0) {
      return NextResponse.json({ error: 'No pages with generated content to export' }, { status: 400 });
    }

    const style = project.style_config || {};
    const slug = project.slug || 'site';
    const siteName = style.siteName || project.name;
    const themeDir = `envosta-theme-${slug}`;

    // Build ZIP
    const zip = new JSZip();

    // Theme files
    zip.file(`${themeDir}/theme.json`, buildThemeJson(style, slug));
    zip.file(`${themeDir}/style.css`, buildStyleCss(siteName, slug));
    zip.file(`${themeDir}/functions.php`, buildFunctionsPhp(style.fonts, slug));
    zip.file(`${themeDir}/templates/index.html`, buildTemplate('index'));
    zip.file(`${themeDir}/templates/front-page.html`, buildTemplate('front-page'));
    zip.file(`${themeDir}/templates/page.html`, buildTemplate('page'));
    zip.file(`${themeDir}/parts/header.html`, buildHeaderPart(siteName));
    zip.file(`${themeDir}/parts/footer.html`, buildFooterPart(siteName));

    // Import plugin
    zip.file(`envosta-import-${slug}.php`, buildImportPlugin(siteName, slug, allPages));

    // Generate ZIP buffer
    const buffer = await zip.generateAsync({ type: 'uint8array' });

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="envosta-theme-${slug}.zip"`,
      },
    });
  } catch (e: any) {
    console.error('Studio export error:', e);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
