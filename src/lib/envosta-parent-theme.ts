/**
 * Envosta parent theme generator.
 *
 * Mirrors the Automattic Assembler theme's FSE defaults (5 color tokens,
 * spacing scale, typography, layout widths) and adds a Shopify-grade
 * WooCommerce shopping experience (cart/checkout/my-account layouts +
 * product grid styling) baked right into the parent.
 *
 * The child theme produced by /api/studio/export sets `Template:
 * envosta-theme` by default and overrides colors/fonts via its own
 * theme.json, while inheriting every template + pattern + block-style
 * defined here.
 */

export const ENVOSTA_PARENT_SLUG = 'envosta-theme';
export const ENVOSTA_PARENT_NAME = 'Envosta';
export const ENVOSTA_PARENT_VERSION = '1.0.0';

// ─── style.css header ───────────────────────────────────────────────

export function envostaParentStyleCss(): string {
  return `/*
Theme Name: Envosta
Theme URI: https://envosta.com
Author: Envosta
Author URI: https://envosta.com
Description: The Envosta parent theme — a Full Site Editing (FSE) theme
  based on Automattic's Assembler, extended with a Shopify-style
  WooCommerce shopping experience. Use an Envosta child theme to
  override colors, fonts, and layout while inheriting templates,
  patterns, and styles from this parent.
Version: ${ENVOSTA_PARENT_VERSION}
Requires at least: 6.4
Tested up to: 6.7
Requires PHP: 8.0
License: GNU General Public License v2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
Text Domain: envosta
Tags: full-site-editing, block-patterns, woocommerce, ecommerce, blog
*/
`;
}

// ─── theme.json — mirrors Assembler's 5-slot palette + typography ──

export function envostaParentThemeJson(): string {
  return JSON.stringify({
    $schema: 'https://schemas.wp.org/trunk/theme.json',
    version: 3,
    settings: {
      appearanceTools: true,
      useRootPaddingAwareAlignments: true,
      color: {
        defaultPalette: false,
        defaultGradients: false,
        defaultDuotone: false,
        palette: [
          { slug: 'theme-1', color: '#FFFFFF', name: 'Color 1' },
          { slug: 'theme-2', color: '#EEEEEE', name: 'Color 2' },
          { slug: 'theme-3', color: '#BBBBBB', name: 'Color 3' },
          { slug: 'theme-4', color: '#1E1E1E', name: 'Color 4' },
          { slug: 'theme-5', color: '#000000', name: 'Color 5' },
        ],
        custom: true,
        customGradient: true,
      },
      typography: {
        fluid: true,
        fontFamilies: [
          {
            fontFamily: '"Inter", sans-serif',
            slug: 'heading',
            name: 'Heading',
          },
          {
            fontFamily: '"Inter", sans-serif',
            slug: 'body',
            name: 'Body',
          },
        ],
        fontSizes: [
          { slug: 'small', size: '16px', name: 'Small', fluid: false },
          { slug: 'medium', size: 'clamp(20px, 2vw, 26px)', name: 'Medium', fluid: { min: '20px', max: '26px' } },
          { slug: 'large', size: 'clamp(32px, 4vw, 40px)', name: 'Large', fluid: { min: '32px', max: '40px' } },
          { slug: 'x-large', size: 'clamp(44px, 5vw, 60px)', name: 'Extra Large', fluid: { min: '44px', max: '60px' } },
          { slug: 'xx-large', size: 'clamp(54px, 6vw, 74px)', name: '2X Large', fluid: { min: '54px', max: '74px' } },
        ],
      },
      spacing: {
        units: ['px', 'em', 'rem', 'vh', 'vw', '%'],
        spacingScale: { operator: '*', increment: 2.2, steps: 7, mediumStep: 20, unit: 'px' },
        spacingSizes: [
          { slug: '20', size: '10px', name: '2X-Small' },
          { slug: '30', size: '16px', name: 'X-Small' },
          { slug: '40', size: '24px', name: 'Small' },
          { slug: '50', size: '32px', name: 'Medium' },
          { slug: '60', size: '48px', name: 'Large' },
          { slug: '70', size: '72px', name: 'Extra Large' },
          { slug: '80', size: '120px', name: '2X Large' },
        ],
      },
      layout: {
        contentSize: '620px',
        wideSize: '1440px',
      },
      border: {
        color: true,
        radius: true,
        style: true,
        width: true,
      },
    },
    styles: {
      color: {
        background: 'var(--wp--preset--color--theme-1)',
        text: 'var(--wp--preset--color--theme-4)',
      },
      typography: {
        fontFamily: 'var(--wp--preset--font-family--body)',
        fontSize: '17px',
        lineHeight: '1.65',
      },
      spacing: {
        padding: {
          top: '0',
          right: 'var(--wp--preset--spacing--40)',
          bottom: '0',
          left: 'var(--wp--preset--spacing--40)',
        },
        blockGap: 'var(--wp--preset--spacing--20)',
      },
      elements: {
        heading: {
          typography: {
            fontFamily: 'var(--wp--preset--font-family--heading)',
            fontWeight: '500',
            lineHeight: '1.1',
            letterSpacing: '-0.02em',
          },
          color: { text: 'var(--wp--preset--color--theme-4)' },
        },
        h1: { typography: { fontSize: 'var(--wp--preset--font-size--xx-large)' } },
        h2: { typography: { fontSize: 'var(--wp--preset--font-size--x-large)' } },
        h3: { typography: { fontSize: 'var(--wp--preset--font-size--large)' } },
        h4: { typography: { fontSize: 'var(--wp--preset--font-size--medium)' } },
        link: {
          color: { text: 'currentColor' },
          typography: { textDecoration: 'underline' },
        },
        button: {
          color: {
            background: 'var(--wp--preset--color--theme-4)',
            text: 'var(--wp--preset--color--theme-1)',
          },
          border: { radius: '0' },
          typography: {
            fontFamily: 'var(--wp--preset--font-family--heading)',
            fontSize: 'var(--wp--preset--font-size--small)',
            fontWeight: '500',
            letterSpacing: '0.02em',
          },
          spacing: {
            padding: { top: '16px', bottom: '16px', left: '28px', right: '28px' },
          },
          ':hover': {
            color: {
              background: 'var(--wp--preset--color--theme-5)',
              text: 'var(--wp--preset--color--theme-1)',
            },
          },
        },
      },
      blocks: {
        'core/navigation': {
          typography: {
            fontFamily: 'var(--wp--preset--font-family--body)',
            fontSize: 'var(--wp--preset--font-size--small)',
          },
        },
        'core/post-title': {
          typography: {
            fontFamily: 'var(--wp--preset--font-family--heading)',
            fontWeight: '500',
          },
        },
        'core/query-pagination': {
          typography: { fontSize: 'var(--wp--preset--font-size--small)' },
        },
      },
    },
    templateParts: [
      { name: 'header', title: 'Header', area: 'header' },
      { name: 'footer', title: 'Footer', area: 'footer' },
    ],
    customTemplates: [
      { name: 'blank', title: 'Blank', postTypes: ['page', 'post'] },
      { name: 'no-title', title: 'No Title', postTypes: ['page', 'post'] },
    ],
  }, null, 2);
}

// ─── functions.php — font loading + WooCommerce CSS enqueue ────────

export function envostaParentFunctionsPhp(): string {
  return `<?php
/**
 * Envosta parent theme.
 */

if (!defined('ABSPATH')) exit;

if (!function_exists('envosta_setup')) {
    function envosta_setup() {
        add_theme_support('post-thumbnails');
        add_theme_support('title-tag');
        add_theme_support('html5', ['search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script']);
        add_theme_support('editor-styles');
        add_theme_support('wp-block-styles');
        add_theme_support('responsive-embeds');
        add_theme_support('align-wide');
        add_theme_support('custom-logo');

        // WooCommerce
        add_theme_support('woocommerce', [
            'thumbnail_image_width' => 600,
            'single_image_width' => 1200,
            'product_grid' => [
                'default_rows' => 3,
                'min_rows' => 1,
                'default_columns' => 4,
                'min_columns' => 2,
                'max_columns' => 6,
            ],
        ]);
        add_theme_support('wc-product-gallery-zoom');
        add_theme_support('wc-product-gallery-lightbox');
        add_theme_support('wc-product-gallery-slider');
    }
}
add_action('after_setup_theme', 'envosta_setup');

if (!function_exists('envosta_enqueue_assets')) {
    function envosta_enqueue_assets() {
        wp_enqueue_style(
            'envosta-base',
            get_template_directory_uri() . '/assets/base.css',
            [],
            wp_get_theme()->get('Version')
        );
        if (class_exists('WooCommerce')) {
            wp_enqueue_style(
                'envosta-woocommerce',
                get_template_directory_uri() . '/assets/woocommerce.css',
                ['envosta-base'],
                wp_get_theme()->get('Version')
            );
        }
    }
}
add_action('wp_enqueue_scripts', 'envosta_enqueue_assets');

// Let child themes pass Google Fonts via add_filter('envosta_google_fonts', ...)
if (!function_exists('envosta_google_fonts')) {
    function envosta_google_fonts() {
        $fonts = apply_filters('envosta_google_fonts', 'Inter:wght@300;400;500;600;700');
        if (!$fonts) return;
        wp_enqueue_style(
            'envosta-google-fonts',
            'https://fonts.googleapis.com/css2?family=' . $fonts . '&display=swap',
            [],
            null
        );
    }
}
add_action('wp_enqueue_scripts', 'envosta_google_fonts');
add_action('enqueue_block_editor_assets', 'envosta_google_fonts');
`;
}

// ─── assets/base.css — foundation styles ──────────────────────────

export function envostaParentBaseCss(): string {
  return `/* Envosta parent theme — base styles */
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
img { max-width: 100%; height: auto; }

/* Buttons — extend core button with hover lift */
.wp-block-button__link {
  transition: background 150ms ease, color 150ms ease, transform 150ms ease;
}
.wp-block-button__link:hover { transform: translateY(-1px); }

/* Cards pattern */
.envosta-card {
  border: 1px solid var(--wp--preset--color--theme-3);
  padding: var(--wp--preset--spacing--50);
  transition: border-color 150ms ease, transform 150ms ease;
}
.envosta-card:hover {
  border-color: var(--wp--preset--color--theme-4);
  transform: translateY(-2px);
}

/* Eyebrow label */
.envosta-eyebrow {
  display: inline-block;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 500;
  opacity: 0.65;
  margin-bottom: 20px;
}

/* Section helpers */
.is-section-soft { background: var(--wp--preset--color--theme-2); }
.is-section-dark {
  background: var(--wp--preset--color--theme-4);
  color: var(--wp--preset--color--theme-1);
}
.is-section-dark h1, .is-section-dark h2, .is-section-dark h3, .is-section-dark h4 {
  color: var(--wp--preset--color--theme-1);
}
`;
}

// ─── assets/woocommerce.css — Shopify-style WC experience ─────────

export function envostaParentWoocommerceCss(): string {
  return `/* Envosta × WooCommerce — Shopify-style shopping experience */

/* ─── Layout: 2-column with sticky order summary on cart + checkout ─── */
.woocommerce-cart .wp-block-woocommerce-cart,
.woocommerce-checkout .wp-block-woocommerce-checkout,
.woocommerce-cart form.woocommerce-cart-form,
.woocommerce-checkout form.checkout {
  max-width: var(--wp--style--global--wide-size, 1440px);
  margin: 0 auto;
  padding: var(--wp--preset--spacing--60) var(--wp--preset--spacing--40);
}

@media (min-width: 980px) {
  .woocommerce-cart form.woocommerce-cart-form,
  .woocommerce-checkout form.checkout {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: var(--wp--preset--spacing--60);
    align-items: start;
  }
  .woocommerce-cart-form__contents,
  .woocommerce-checkout .col2-set,
  .woocommerce-checkout #customer_details {
    grid-column: 1;
  }
  .cart_totals,
  .woocommerce-checkout-review-order,
  #order_review {
    grid-column: 2;
    position: sticky;
    top: var(--wp--preset--spacing--50);
    background: var(--wp--preset--color--theme-2);
    padding: var(--wp--preset--spacing--50);
    border: 1px solid var(--wp--preset--color--theme-3);
  }
}

/* ─── Progress indicator (decorative; displayed on cart + checkout) ── */
.woocommerce-cart::before,
.woocommerce-checkout::before {
  content: '1. Cart  →  2. Information  →  3. Shipping  →  4. Payment';
  display: block;
  text-align: center;
  padding: var(--wp--preset--spacing--30) 0;
  font-family: var(--wp--preset--font-family--heading);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--wp--preset--color--theme-3);
  border-bottom: 1px solid var(--wp--preset--color--theme-3);
}

/* ─── Cart line items ─── */
.woocommerce-cart-form__contents table,
.woocommerce table.shop_table {
  border: 0;
  border-collapse: collapse;
  width: 100%;
}
.woocommerce-cart-form__contents th,
.woocommerce table.shop_table th {
  font-family: var(--wp--preset--font-family--heading);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--wp--preset--color--theme-3);
  text-align: left;
  padding: var(--wp--preset--spacing--30) 0;
  border-bottom: 1px solid var(--wp--preset--color--theme-3);
}
.woocommerce-cart-form__contents td,
.woocommerce table.shop_table td {
  padding: var(--wp--preset--spacing--40) 0;
  border-bottom: 1px solid var(--wp--preset--color--theme-3);
  vertical-align: middle;
}
.woocommerce-cart-form__contents td.product-thumbnail img {
  width: 80px;
  height: 80px;
  object-fit: cover;
}

/* ─── Quantity stepper ─── */
.woocommerce .quantity {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--wp--preset--color--theme-3);
}
.woocommerce .quantity input[type="number"] {
  border: 0;
  width: 48px;
  text-align: center;
  background: transparent;
  font-size: 15px;
  padding: 8px 4px;
  -moz-appearance: textfield;
}
.woocommerce .quantity input[type="number"]::-webkit-outer-spin-button,
.woocommerce .quantity input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* ─── Buttons ─── */
.woocommerce button.button,
.woocommerce a.button,
.woocommerce input.button,
#place_order {
  background: var(--wp--preset--color--theme-4) !important;
  color: var(--wp--preset--color--theme-1) !important;
  border: 1px solid var(--wp--preset--color--theme-4) !important;
  border-radius: 0 !important;
  font-family: var(--wp--preset--font-family--heading) !important;
  font-weight: 500 !important;
  letter-spacing: 0.02em !important;
  padding: 16px 28px !important;
  transition: background 150ms ease, border-color 150ms ease !important;
}
.woocommerce button.button:hover,
.woocommerce a.button:hover,
.woocommerce input.button:hover,
#place_order:hover {
  background: var(--wp--preset--color--theme-5) !important;
  border-color: var(--wp--preset--color--theme-5) !important;
}
.woocommerce a.button.alt,
.woocommerce-page button.button.alt,
.single_add_to_cart_button {
  background: var(--wp--preset--color--theme-4) !important;
  color: var(--wp--preset--color--theme-1) !important;
}

/* ─── Form fields ─── */
.woocommerce form .form-row input.input-text,
.woocommerce form .form-row textarea,
.woocommerce form .form-row select {
  width: 100%;
  border: 1px solid var(--wp--preset--color--theme-3);
  padding: 14px 16px;
  font-family: var(--wp--preset--font-family--body);
  font-size: 15px;
  border-radius: 0;
  background: var(--wp--preset--color--theme-1);
  transition: border-color 150ms ease;
}
.woocommerce form .form-row input.input-text:focus,
.woocommerce form .form-row textarea:focus,
.woocommerce form .form-row select:focus {
  outline: 0;
  border-color: var(--wp--preset--color--theme-4);
}
.woocommerce form .form-row label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--wp--preset--color--theme-4);
}

/* ─── Order summary block ─── */
.woocommerce-checkout-review-order-table th,
.woocommerce-checkout-review-order-table td {
  padding: 12px 0;
  border-bottom: 1px solid var(--wp--preset--color--theme-3);
}
.woocommerce-checkout-review-order-table tfoot .order-total {
  font-size: 18px;
  font-weight: 600;
}

/* ─── Trust badges row (theme authors can drop a <div class="envosta-trust-row"> around tiles) ─── */
.envosta-trust-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--wp--preset--spacing--40);
  padding: var(--wp--preset--spacing--60) var(--wp--preset--spacing--40);
  background: var(--wp--preset--color--theme-2);
  text-align: center;
}
@media (max-width: 720px) {
  .envosta-trust-row { grid-template-columns: repeat(2, 1fr); }
}
.envosta-trust-row > div {
  font-size: 13px;
  color: var(--wp--preset--color--theme-4);
}
.envosta-trust-row strong {
  display: block;
  font-size: 15px;
  margin-bottom: 4px;
}

/* ─── Product grid cards (applies to Product Collection block output) ─── */
.wp-block-woocommerce-product-collection .wc-block-product {
  border: 1px solid transparent;
  transition: border-color 150ms ease, transform 150ms ease;
}
.wp-block-woocommerce-product-collection .wc-block-product:hover {
  border-color: var(--wp--preset--color--theme-3);
  transform: translateY(-2px);
}
.wp-block-woocommerce-product-collection .wc-block-product img {
  aspect-ratio: 1 / 1;
  object-fit: cover;
  width: 100%;
}
.wp-block-woocommerce-product-collection .wc-block-components-product-price {
  font-family: var(--wp--preset--font-family--heading);
  font-weight: 500;
  color: var(--wp--preset--color--theme-4);
}

/* ─── My Account sidebar (Shopify-style dashboard) ─── */
@media (min-width: 780px) {
  .woocommerce-account .woocommerce-MyAccount-navigation {
    width: 240px;
    float: left;
    padding-right: var(--wp--preset--spacing--50);
  }
  .woocommerce-account .woocommerce-MyAccount-content {
    margin-left: 240px;
  }
}
.woocommerce-MyAccount-navigation ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.woocommerce-MyAccount-navigation ul li {
  margin: 0;
  border-bottom: 1px solid var(--wp--preset--color--theme-3);
}
.woocommerce-MyAccount-navigation ul li a {
  display: block;
  padding: 12px 0;
  text-decoration: none;
  font-size: 14px;
  color: var(--wp--preset--color--theme-4);
}
.woocommerce-MyAccount-navigation ul li.is-active a,
.woocommerce-MyAccount-navigation ul li a:hover {
  font-weight: 500;
}

/* ─── Notices ─── */
.woocommerce-notices-wrapper .woocommerce-message,
.woocommerce-notices-wrapper .woocommerce-info,
.woocommerce-notices-wrapper .woocommerce-error {
  border-left: 3px solid var(--wp--preset--color--theme-4);
  background: var(--wp--preset--color--theme-2);
  padding: var(--wp--preset--spacing--40);
  margin-bottom: var(--wp--preset--spacing--40);
  font-size: 14px;
  border-radius: 0;
}
`;
}

// ─── FSE templates ─────────────────────────────────────────────────

export function envostaParentTemplateIndex(): string {
  return `<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
  <!-- wp:query {"queryId":0,"query":{"perPage":10,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","inherit":true}} -->
  <div class="wp-block-query">
    <!-- wp:post-template -->
      <!-- wp:post-featured-image {"isLink":true} /-->
      <!-- wp:post-title {"isLink":true,"level":2} /-->
      <!-- wp:post-excerpt /-->
      <!-- wp:post-date /-->
    <!-- /wp:post-template -->
    <!-- wp:query-pagination -->
      <!-- wp:query-pagination-previous /-->
      <!-- wp:query-pagination-numbers /-->
      <!-- wp:query-pagination-next /-->
    <!-- /wp:query-pagination -->
  </div>
  <!-- /wp:query -->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->`;
}

export function envostaParentTemplatePage(): string {
  return `<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
  <!-- wp:post-title {"level":1} /-->
  <!-- wp:post-content /-->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->`;
}

export function envostaParentTemplateSingle(): string {
  return `<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
  <!-- wp:post-featured-image {"align":"wide"} /-->
  <!-- wp:post-title {"level":1} /-->
  <!-- wp:group {"layout":{"type":"flex","flexWrap":"wrap"}} -->
  <div class="wp-block-group">
    <!-- wp:post-date /-->
    <!-- wp:post-author-name /-->
    <!-- wp:post-terms {"term":"category"} /-->
  </div>
  <!-- /wp:group -->
  <!-- wp:post-content /-->
  <!-- wp:comments /-->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->`;
}

export function envostaParentTemplateArchive(): string {
  return `<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
  <!-- wp:query-title {"type":"archive"} /-->
  <!-- wp:term-description /-->
  <!-- wp:query {"queryId":0,"query":{"perPage":10,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","inherit":true}} -->
  <div class="wp-block-query">
    <!-- wp:post-template -->
      <!-- wp:post-featured-image {"isLink":true} /-->
      <!-- wp:post-title {"isLink":true,"level":2} /-->
      <!-- wp:post-excerpt /-->
    <!-- /wp:post-template -->
    <!-- wp:query-pagination -->
      <!-- wp:query-pagination-previous /-->
      <!-- wp:query-pagination-numbers /-->
      <!-- wp:query-pagination-next /-->
    <!-- /wp:query-pagination -->
  </div>
  <!-- /wp:query -->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->`;
}

export function envostaParentTemplate404(): string {
  return `<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80"}}},"layout":{"type":"constrained"}} -->
<main class="wp-block-group alignfull">
  <!-- wp:heading {"level":1,"textAlign":"center","fontSize":"xx-large"} -->
  <h1 class="wp-block-heading has-text-align-center has-xx-large-font-size">404</h1>
  <!-- /wp:heading -->
  <!-- wp:paragraph {"align":"center"} -->
  <p class="has-text-align-center">Looks like this page took a wrong turn. Try searching, or head back home.</p>
  <!-- /wp:paragraph -->
  <!-- wp:search {"label":"","buttonText":"Search","align":"center"} /-->
  <!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
  <div class="wp-block-buttons">
    <!-- wp:button -->
    <div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="/">Back to home</a></div>
    <!-- /wp:button -->
  </div>
  <!-- /wp:buttons -->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->`;
}

export function envostaParentTemplateSearch(): string {
  return `<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
  <!-- wp:search {"label":"Search","buttonText":"Search"} /-->
  <!-- wp:query-title {"type":"search"} /-->
  <!-- wp:query {"queryId":0,"query":{"perPage":10,"pages":0,"offset":0,"postType":"post","inherit":true}} -->
  <div class="wp-block-query">
    <!-- wp:post-template -->
      <!-- wp:post-title {"isLink":true,"level":3} /-->
      <!-- wp:post-excerpt /-->
      <!-- wp:post-date /-->
    <!-- /wp:post-template -->
    <!-- wp:query-no-results -->
      <!-- wp:paragraph -->
      <p>No results — try a different search.</p>
      <!-- /wp:paragraph -->
    <!-- /wp:query-no-results -->
    <!-- wp:query-pagination -->
      <!-- wp:query-pagination-previous /-->
      <!-- wp:query-pagination-numbers /-->
      <!-- wp:query-pagination-next /-->
    <!-- /wp:query-pagination -->
  </div>
  <!-- /wp:query -->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->`;
}

// ─── Template parts ────────────────────────────────────────────────

export function envostaParentPartHeader(): string {
  return `<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|30","bottom":"var:preset|spacing|30","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"layout":{"type":"flex","justifyContent":"space-between","flexWrap":"nowrap"}} -->
<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--30);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--30);padding-left:var(--wp--preset--spacing--40)">
  <!-- wp:site-title {"level":0} /-->
  <!-- wp:navigation {"ref":0,"overlayMenu":"mobile","icon":"menu","openSubmenusOnClick":true,"overlayBackgroundColor":"theme-1","overlayTextColor":"theme-4","layout":{"type":"flex","justifyContent":"right","flexWrap":"nowrap"}} /-->
</div>
<!-- /wp:group -->`;
}

export function envostaParentPartFooter(): string {
  return `<!-- wp:group {"align":"full","backgroundColor":"theme-5","textColor":"theme-1","style":{"spacing":{"padding":{"top":"var:preset|spacing|70","bottom":"var:preset|spacing|50","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull has-theme-1-color has-theme-5-background-color has-text-color has-background" style="padding-top:var(--wp--preset--spacing--70);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--50);padding-left:var(--wp--preset--spacing--40)">
  <!-- wp:site-title {"level":0,"textColor":"theme-1"} /-->
  <!-- wp:navigation {"ref":0,"overlayMenu":"never","textColor":"theme-1","layout":{"type":"flex","justifyContent":"center","flexWrap":"wrap"}} /-->
  <!-- wp:paragraph {"align":"center","fontSize":"small"} -->
  <p class="has-text-align-center has-small-font-size">© <a href="/">Site Name</a> — Built with Envosta</p>
  <!-- /wp:paragraph -->
</div>
<!-- /wp:group -->`;
}

// ─── Bundle builder — emits every file relative to theme root ─────

export type ParentThemeFile = { path: string; body: string };

export function buildEnvostaParentThemeFiles(): ParentThemeFile[] {
  const dir = ENVOSTA_PARENT_SLUG;
  return [
    { path: `${dir}/style.css`, body: envostaParentStyleCss() },
    { path: `${dir}/theme.json`, body: envostaParentThemeJson() },
    { path: `${dir}/functions.php`, body: envostaParentFunctionsPhp() },
    { path: `${dir}/assets/base.css`, body: envostaParentBaseCss() },
    { path: `${dir}/assets/woocommerce.css`, body: envostaParentWoocommerceCss() },
    { path: `${dir}/templates/index.html`, body: envostaParentTemplateIndex() },
    { path: `${dir}/templates/page.html`, body: envostaParentTemplatePage() },
    { path: `${dir}/templates/single.html`, body: envostaParentTemplateSingle() },
    { path: `${dir}/templates/archive.html`, body: envostaParentTemplateArchive() },
    { path: `${dir}/templates/404.html`, body: envostaParentTemplate404() },
    { path: `${dir}/templates/search.html`, body: envostaParentTemplateSearch() },
    { path: `${dir}/parts/header.html`, body: envostaParentPartHeader() },
    { path: `${dir}/parts/footer.html`, body: envostaParentPartFooter() },
  ];
}
