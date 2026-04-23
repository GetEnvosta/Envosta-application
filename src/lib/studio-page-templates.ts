/**
 * Catalogue of named page + template-part presets the studio can add to
 * a project. Keyed by the category that gets surfaced in the design-tool
 * sidebar. Each entry includes the prompt the AI is given when that page
 * is (re)generated so it produces the right kind of content + embeds the
 * right WordPress core / WooCommerce blocks.
 *
 * The Envosta parent theme ships templates for all of these, so adding
 * one in the studio creates a matching page + the parent's template
 * kicks in on render.
 */

export type StudioPageTemplate = {
  title: string;
  slug: string;
  description: string;
  prompt: string;
};

const SHOP_PROMPT = `WooCommerce SHOP page — full design freedom. Build whatever catalogue experience fits the brand (hero, collections, category strips, brand story, seasonal features, editorial sections, trust signals, etc.). Aim for a premium, bespoke feel — Shopify-Dawn quality floor, but please don't copy it verbatim.

The ONLY non-negotiable: the actual product grid MUST render using the WooCommerce Product Collection Gutenberg block, not a shortcode and not a hand-rolled grid of placeholder tiles. Embed it exactly as:

<!-- wp:woocommerce/product-collection {"queryId":0,"query":{"perPage":12,"pages":0,"offset":0,"postType":"product","order":"asc","orderBy":"title","inherit":false,"taxQuery":{},"woocommerceOnSale":false,"woocommerceStockStatus":["instock","outofstock","onbackorder"]},"displayLayout":{"type":"flex","columns":4,"shrinkColumns":true}} -->
<div class="wp-block-woocommerce-product-collection">
  <!-- wp:woocommerce/product-template -->
  <!-- /wp:woocommerce/product-template -->
</div>
<!-- /wp:woocommerce/product-collection -->

Feel free to customise the block's attributes (columns 2-6, orderBy title/popularity/rating/price/date, perPage, woocommerceOnSale true/false, filter by category via taxQuery) and include MULTIPLE Product Collection blocks for different sections.`;

const CART_PROMPT = `WooCommerce CART page — Shopify-grade cart. Structure:
- Slim progress indicator (Cart → Information → Shipping → Payment).
- Two-column desktop layout: LEFT cart line items with quantity steppers + remove + price. RIGHT sticky order summary with subtotal, estimated shipping, discount code, total, "Checkout" CTA.
- Include <!-- wp:woocommerce/cart /--> inside a styled wrapper so real cart functionality works.
- Trust badges + "You may also like" upsell grid below.
- Mobile: stacks, summary becomes sticky bottom sheet.`;

const CHECKOUT_PROMPT = `WooCommerce CHECKOUT page — Shopify-grade checkout. Structure:
- Progress indicator (Cart ✓ → Info → Shipping → Payment).
- Two-column desktop: LEFT contact + shipping + payment fields, RIGHT sticky order summary with thumbnails + trust block.
- Include <!-- wp:woocommerce/checkout /--> inside a styled wrapper.
- Under form: payment-method logos (Visa, MC, Apple Pay, PayPal), 256-bit SSL microcopy.`;

const MY_ACCOUNT_PROMPT = `WooCommerce MY ACCOUNT page — customer dashboard. Welcome header + stats, left sidebar nav (Dashboard, Orders, Addresses, Payment methods, Downloads, Account details, Logout), main panel recent orders table with Reorder buttons, saved addresses + payment cards.
Include <!-- wp:woocommerce/customer-account /--> or individual account blocks so the real account UI renders.`;

const SINGLE_PRODUCT_PROMPT = `WooCommerce SINGLE PRODUCT template — the product-detail page. Structure suggestion (adapt freely):
- Two-column top: LEFT gallery (main + thumb strip), RIGHT title + price + short description + variation selector + quantity + Add-to-cart + SKU + trust micro-badges.
- Description / Spec / Shipping / Reviews tabs below.
- Related products row via another Product Collection block.
Use the official WooCommerce single-product blocks:
<!-- wp:woocommerce/single-product /-->
or individual blocks:
<!-- wp:woocommerce/product-image-gallery /-->
<!-- wp:woocommerce/product-details /-->
<!-- wp:woocommerce/add-to-cart-form /-->
<!-- wp:woocommerce/product-meta /-->`;

const BLOG_ARCHIVE_PROMPT = `BLOG ARCHIVE page — lists all blog posts. Full design freedom for editorial layout. Typical: hero with blog name + tagline, category filter pills, masonry / asymmetric post-card grid, featured sticky post, newsletter CTA.
Use the WordPress Query Loop block for real posts:
<!-- wp:query {"queryId":0,"query":{"perPage":12,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","inherit":false}} -->
<div class="wp-block-query">
  <!-- wp:post-template -->
  <!-- wp:post-featured-image {"isLink":true} /-->
  <!-- wp:post-title {"isLink":true,"level":3} /-->
  <!-- wp:post-excerpt /-->
  <!-- wp:post-date /-->
  <!-- /wp:post-template -->
  <!-- wp:query-pagination -->
    <!-- wp:query-pagination-previous /-->
    <!-- wp:query-pagination-numbers /-->
    <!-- wp:query-pagination-next /-->
  <!-- /wp:query-pagination -->
</div>
<!-- /wp:query -->`;

const SINGLE_POST_PROMPT = `SINGLE POST template — the template used to render individual blog posts. Suggested structure: hero (featured image + category pill + title + author + date + reading time + share), content at ~620-720px reading width with strong typography, floating TOC on desktop, author bio card at end, related posts (3-col), newsletter CTA.
Use core post blocks:
<!-- wp:post-featured-image /-->
<!-- wp:post-title /-->
<!-- wp:post-date /-->
<!-- wp:post-author-name /-->
<!-- wp:post-content /-->
<!-- wp:post-terms {"term":"category"} /-->
<!-- wp:comments /-->
Feel: premium editorial like Medium / Substack.`;

const NOT_FOUND_PROMPT = `404 "Not Found" template — shown when a URL doesn't exist. Keep it human and helpful. Large "404" typography (decorative or integrated into wordmark), empathetic headline ("Looks like this page took a wrong turn"), primary CTA back to home + secondary to a search, small row of links to popular destinations.
Include a Search block:
<!-- wp:search {"label":"Try searching","buttonText":"Search"} /-->`;

const SEARCH_RESULTS_PROMPT = `SEARCH RESULTS template — shown when a visitor runs a site search. Hero with Search block pre-populated + result count, optional filter/sort row, Query Loop with inherit:true so it uses the search query:
<!-- wp:query {"queryId":0,"query":{"perPage":12,"pages":0,"offset":0,"postType":"post","inherit":true}} -->
<div class="wp-block-query">
  <!-- wp:post-template -->
  <!-- wp:post-title {"isLink":true,"level":3} /-->
  <!-- wp:post-excerpt /-->
  <!-- wp:post-date /-->
  <!-- /wp:post-template -->
  <!-- wp:query-no-results -->
    <!-- wp:paragraph --><p>No results — try a different search.</p><!-- /wp:paragraph -->
  <!-- /wp:query-no-results -->
  <!-- wp:query-pagination -->
    <!-- wp:query-pagination-previous /-->
    <!-- wp:query-pagination-numbers /-->
    <!-- wp:query-pagination-next /-->
  <!-- /wp:query-pagination -->
</div>
<!-- /wp:query -->`;

export const WOOCOMMERCE_TEMPLATES: StudioPageTemplate[] = [
  { title: 'Shop',            slug: 'shop',            description: 'Product catalogue landing page', prompt: SHOP_PROMPT },
  { title: 'Single Product',  slug: 'single-product',  description: 'Product-detail template',        prompt: SINGLE_PRODUCT_PROMPT },
  { title: 'Cart',            slug: 'cart',            description: 'Shopping-cart page',             prompt: CART_PROMPT },
  { title: 'Checkout',        slug: 'checkout',        description: 'Checkout flow',                  prompt: CHECKOUT_PROMPT },
  { title: 'My Account',      slug: 'my-account',      description: 'Customer account dashboard',     prompt: MY_ACCOUNT_PROMPT },
];

export const BLOG_TEMPLATES: StudioPageTemplate[] = [
  { title: 'Blog',        slug: 'blog',        description: 'Blog archive (Query Loop)',     prompt: BLOG_ARCHIVE_PROMPT },
  { title: 'Single Post', slug: 'single-post', description: 'Single-post template',          prompt: SINGLE_POST_PROMPT },
];

export const SYSTEM_TEMPLATES: StudioPageTemplate[] = [
  { title: '404',            slug: '404',              description: '404 / not-found template',      prompt: NOT_FOUND_PROMPT },
  { title: 'Search Results', slug: 'search-results',   description: 'Site search results template',  prompt: SEARCH_RESULTS_PROMPT },
];

export function getTemplateByTitle(title: string): StudioPageTemplate | undefined {
  const all = [...WOOCOMMERCE_TEMPLATES, ...BLOG_TEMPLATES, ...SYSTEM_TEMPLATES];
  return all.find(t => t.title.toLowerCase() === title.toLowerCase());
}
