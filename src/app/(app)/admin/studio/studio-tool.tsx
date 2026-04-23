'use client';

import { useState, useEffect, useRef } from 'react';
import { StepBrief } from '@/components/studio/step-brief';
import { StepDesign } from '@/components/studio/step-design';
import { StepExport } from '@/components/studio/step-export';
import { Paintbrush, RotateCcw, Check, Loader2 } from 'lucide-react';
import { importStudioZip, importStudioXml } from '@/lib/studio-import';
import { extractStylesFromHtml } from '@/lib/extract-styles-from-html';

let idCounter = 0;
function localId() { return `local-${++idCounter}-${Date.now()}`; }

const STORAGE_KEY = 'envosta.studio.draft.v1';
const DEFAULT_PAGES = ['Home', 'About', 'Services', 'Contact'];

// Always added to every project so the theme has proper fallbacks.
const SYSTEM_PAGE_TITLES = ['404', 'Search Results'];

type Snapshot = {
  step: number;
  brief: string;
  briefOptions: any[];
  selectedBrief: number | null;
  businessInfo: any;
  styleConfig: any;
  pages: any[];
  selectedPageId: string;
  projectName: string;
  referenceHtml: string;
  referenceHtmlName: string;
  savedAt: number;
};

export function StudioTool() {
  const [step, setStep] = useState(1);
  const [brief, setBrief] = useState('');
  const [briefOptions, setBriefOptions] = useState<any[]>([]);
  const [selectedBrief, setSelectedBrief] = useState<number | null>(null);
  const [businessInfo, setBusinessInfo] = useState<any>({ pages: DEFAULT_PAGES });
  // Mode default: 'parent' — use the Envosta parent theme's presets. Full
  // Custom mode (header toggle) flips this to 'custom' and unlocks per-field
  // overrides. Persisted via the snapshot.
  const [styleConfig, setStyleConfig] = useState<any>({ mode: 'parent' });
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [referenceHtml, setReferenceHtml] = useState('');
  const [referenceHtmlName, setReferenceHtmlName] = useState('');

  // Persistence state
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  // Summary shown on the brief step right after a successful import, with a
  // CTA to continue to the design step immediately if the user wants.
  const [importedSummary, setImportedSummary] = useState<{ projectName: string; pageCount: number } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportError('');
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith('.zip')) {
        const result = await importStudioZip(file);
        setBrief(prev => prev || `Imported from ${result.projectName}`);
        setProjectName(result.projectName);
        setBusinessInfo((prev: any) => ({
          ...prev,
          businessName: prev.businessName || result.projectName,
          pages: result.pages.length > 0 ? result.pages.map(p => p.title) : (prev.pages || DEFAULT_PAGES),
        }));
        setStyleConfig(result.styleConfig);
        if (result.pages.length > 0) {
          setPages(result.pages);
          setSelectedPageId(result.pages[0].id);
        }
        setImportedSummary({ projectName: result.projectName, pageCount: result.pages.length });
      } else if (name.endsWith('.xml')) {
        const importedPages = await importStudioXml(file);
        if (importedPages.length === 0) throw new Error('No pages found in XML');
        setPages(importedPages);
        setSelectedPageId(importedPages[0].id);
        setImportedSummary({ projectName: projectName || 'Imported site', pageCount: importedPages.length });
      } else {
        throw new Error('Please upload a .zip or .xml file');
      }
    } catch (err: any) {
      setImportError(err?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  // Load saved draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s: Snapshot = JSON.parse(raw);
        if (s && typeof s === 'object') {
          setStep(s.step ?? 1);
          setBrief(s.brief ?? '');
          setBriefOptions(s.briefOptions ?? []);
          setSelectedBrief(s.selectedBrief ?? null);
          setBusinessInfo(s.businessInfo ?? { pages: DEFAULT_PAGES });
          setStyleConfig(s.styleConfig ?? {});
          setPages(s.pages ?? []);
          setSelectedPageId(s.selectedPageId ?? '');
          setProjectName(s.projectName ?? '');
          setReferenceHtml(s.referenceHtml ?? '');
          setReferenceHtmlName(s.referenceHtmlName ?? '');
          setSavedAt(s.savedAt ?? null);
        }
      }
    } catch (err) {
      console.error('Failed to load studio draft:', err);
    }
    setHydrated(true);
  }, []);

  // Auto-save (debounced) on any state change after hydration
  useEffect(() => {
    if (!hydrated) return;
    setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        const snap: Snapshot = {
          step, brief, briefOptions, selectedBrief, businessInfo,
          styleConfig, pages, selectedPageId, projectName,
          referenceHtml, referenceHtmlName,
          savedAt: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
        setSavedAt(snap.savedAt);
      } catch (err) {
        console.error('Failed to save studio draft:', err);
      } finally {
        setSaving(false);
      }
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [hydrated, step, brief, briefOptions, selectedBrief, businessInfo, styleConfig, pages, selectedPageId, projectName, referenceHtml, referenceHtmlName]);

  function reset() {
    if (!confirm('Start over? This will erase your saved draft.')) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setStep(1);
    setBrief('');
    setBriefOptions([]);
    setSelectedBrief(null);
    setBusinessInfo({ pages: DEFAULT_PAGES });
    setStyleConfig({ mode: 'parent' });
    setPages([]);
    setSelectedPageId('');
    setProjectName('');
    setReferenceHtml('');
    setReferenceHtmlName('');
    setImportedSummary(null);
    setSavedAt(null);
    idCounter = 0;
  }

  const savedLabel = (() => {
    if (saving) return 'Saving…';
    if (!savedAt) return null;
    const diff = Date.now() - savedAt;
    if (diff < 5000) return 'Saved';
    if (diff < 60_000) return `Saved ${Math.floor(diff / 1000)}s ago`;
    if (diff < 3_600_000) return `Saved ${Math.floor(diff / 60_000)}m ago`;
    return `Saved ${new Date(savedAt).toLocaleTimeString()}`;
  })();

  return (
    <div className="flex flex-col h-full">
      {/* Unified top bar — studio chrome + step-specific toolbar (portalled in) */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-gray-200 bg-white shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <Paintbrush className="w-4 h-4 text-purple-600" />
          <h1 className="text-sm font-semibold text-gray-900">Studio</h1>
        </div>

        <div className="w-px h-5 bg-gray-200 shrink-0" />

        {/* Slot for step-specific toolbar items (filled by StepDesign via portal) */}
        <div id="studio-header-slot" className="flex-1 flex items-center min-w-0" />

        <div className="w-px h-5 bg-gray-200 shrink-0" />

        {/* Full custom toggle — the single global switch that decides whether
            the child theme overrides anything (on) or inherits everything
            from the Envosta parent theme's presets (off, default). */}
        {(() => {
          const fullCustom = (styleConfig.mode === 'preset' ? 'custom' : (styleConfig.mode || 'parent')) === 'custom';
          return (
            <button
              onClick={() => setStyleConfig((prev: any) => ({ ...prev, mode: fullCustom ? 'parent' : 'custom' }))}
              role="switch"
              aria-checked={fullCustom}
              className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${fullCustom ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
              title={fullCustom
                ? 'Full custom mode — child theme overrides colors, fonts, and styles'
                : 'Parent mode — inherits everything from the Envosta parent theme'}
            >
              <span className={`relative inline-flex h-3.5 w-6 rounded-full transition-colors ${fullCustom ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                <span className={`inline-block h-2.5 w-2.5 translate-y-[2px] rounded-full bg-white shadow transition-transform ${fullCustom ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
              </span>
              Full custom
            </button>
          );
        })()}

        {/* Utilities (right side) */}
        {savedLabel && (
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 shrink-0" title={savedAt ? new Date(savedAt).toLocaleString() : ''}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-emerald-500" />}
            {savedLabel}
          </span>
        )}
        {step > 1 && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors shrink-0"
            title="Start over — clears the saved draft"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
        {importError && <span className="text-[11px] text-red-600 shrink-0 truncate max-w-[200px]">{importError}</span>}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-auto">
        {step === 1 && (
          <StepBrief
            projectId=""
            brief={brief}
            briefOptions={briefOptions}
            selectedBrief={selectedBrief}
            businessInfo={businessInfo}
            onBriefChange={setBrief}
            onOptionsGenerated={setBriefOptions}
            onBusinessInfoChange={setBusinessInfo}
            referenceHtml={referenceHtml}
            referenceHtmlName={referenceHtmlName}
            onReferenceHtmlChange={(html, name) => {
              setReferenceHtml(html);
              setReferenceHtmlName(name);
            }}
            onImportPreviousWebsite={handleImportFile}
            importing={importing}
            importError={importError}
            importedSummary={importedSummary}
            onContinueToDesign={async () => {
              // Imported flow: pages already exist, just advance.
              if (pages.length > 0) {
                setImportedSummary(null);
                setStep(2);
                return;
              }

              if (businessInfo.businessName) setProjectName(businessInfo.businessName);

              // Fire two AI calls in parallel:
              //   1) suggest-style picks an Envosta parent style variation
              //   2) suggest-site-meta fills in any remaining blank
              //      businessName / tagline / industry / targetAudience.
              // Both are fire-and-forget; errors are non-fatal.
              const briefForAi = brief;
              try {
                const [styleRes, metaRes] = await Promise.all([
                  fetch('/api/studio/suggest-style', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ brief: briefForAi, businessInfo }),
                  }),
                  fetch('/api/studio/suggest-site-meta', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ brief: briefForAi, businessInfo }),
                  }),
                ]);

                if (styleRes.ok) {
                  const data = await styleRes.json();
                  if (data?.preset) {
                    setStyleConfig((prev: any) => ({
                      ...prev,
                      ...data.preset.config,
                      presetId: data.preset.id,
                      mode: prev.mode === 'custom' ? 'custom' : 'parent',
                    }));
                  }
                }

                if (metaRes.ok) {
                  const data = await metaRes.json();
                  const s = data?.suggested;
                  if (s && typeof s === 'object' && Object.keys(s).length > 0) {
                    setBusinessInfo((prev: any) => {
                      const next = { ...prev };
                      // User input always wins — only fill blank fields.
                      for (const k of Object.keys(s)) {
                        if (!next[k]) next[k] = s[k];
                      }
                      return next;
                    });
                    // If businessName was just filled, mirror it to projectName
                    // so the export filename + slug reflect the brand.
                    if (s.businessName && !projectName) setProjectName(s.businessName);
                  }
                }
              } catch {}

              const userPageNames: string[] = (businessInfo.pages && businessInfo.pages.length > 0)
                ? businessInfo.pages
                : DEFAULT_PAGES;
              // Always add the system pages (404, Search Results) at the end,
              // skipping any that the user already included.
              const userLower = new Set(userPageNames.map(p => p.toLowerCase()));
              const systemExtras = SYSTEM_PAGE_TITLES.filter(s => !userLower.has(s.toLowerCase()));
              const pageNames: string[] = [...userPageNames, ...systemExtras];
              const selectedConcept = brief;
              // Per-page prompt: WooCommerce pages get Shopify-grade e-commerce
              // guidance; everything else gets the concept-aware generic prompt.
              const specialPagePrompt = (name: string): string | null => {
                const n = name.toLowerCase();
                if (n === 'shop') {
                  return `WooCommerce SHOP page — full design freedom. Build whatever catalogue experience fits the brand (hero, collections, category strips, brand story, seasonal features, editorial sections, trust signals, etc.). Aim for a premium, bespoke feel — Shopify-Dawn quality floor, but please don't copy it verbatim.

The ONLY non-negotiable: the actual product grid MUST render using the WooCommerce Product Collection Gutenberg block, not a shortcode and not a hand-rolled grid of placeholder tiles. Embed it exactly as:

<!-- wp:woocommerce/product-collection {"queryId":0,"query":{"perPage":12,"pages":0,"offset":0,"postType":"product","order":"asc","orderBy":"title","inherit":false,"taxQuery":{},"woocommerceOnSale":false,"woocommerceStockStatus":["instock","outofstock","onbackorder"]},"displayLayout":{"type":"flex","columns":4,"shrinkColumns":true}} -->
<div class="wp-block-woocommerce-product-collection">
  <!-- wp:woocommerce/product-template -->
  <!-- /wp:woocommerce/product-template -->
</div>
<!-- /wp:woocommerce/product-collection -->

Feel free to customise the block's attributes in the opening comment (columns 2-6, orderBy title/popularity/rating/price/date, perPage, woocommerceOnSale true/false, filter by category via taxQuery, etc.) to match the section you're building. You can include MULTIPLE Product Collection blocks — e.g. a "Best sellers" one (orderBy popularity, perPage 4) and a full catalogue one (perPage 12, columns 4) — and style the sections around them freely. Wrap each block in whatever sectional markup you want; WordPress will render the tiles inside.`;
                }
                if (n === 'cart') {
                  return `WooCommerce CART page — build a Shopify-grade cart experience. Structure:
- Slim progress indicator at top (Cart → Information → Shipping → Payment).
- Two-column layout (desktop): LEFT = cart line items with quantity steppers, remove, price. RIGHT = sticky order summary with subtotal, estimated shipping, discount code input, total, and a big "Checkout" CTA linking to /checkout.
- Include the WooCommerce shortcode [woocommerce_cart] inside a styled wrapper so real cart functionality works.
- Below the fold: trust badges (free shipping, 30-day returns, secure checkout), "You may also like" upsell grid, recently viewed strip.
- Mobile: stacks to single column, order summary collapses into a sticky bottom sheet.
- Feel: calm, confident, frictionless — Shopify-level polish.`;
                }
                if (n === 'checkout') {
                  return `WooCommerce CHECKOUT page — build a Shopify-grade checkout. Structure:
- Slim progress indicator at top (Cart ✓ → Information → Shipping → Payment).
- Two-column layout (desktop): LEFT = contact info → shipping address → shipping method → payment fields. RIGHT = sticky order summary with product thumbnails, subtotal, discount code, shipping, tax, total, and a trust block (secure, 30-day returns, support).
- Include the WooCommerce shortcode [woocommerce_checkout] inside a styled wrapper so real checkout fields render. Use the surrounding layout to visually guide the user through the form.
- Under-form row: payment-method logos (Visa, MC, Apple Pay, PayPal), security seal, "256-bit SSL" microcopy.
- Mobile: order summary becomes collapsible accordion at top; fields flow full-width.
- Feel: fast, trustworthy, never crowded — Shopify-Dawn polish.`;
                }
                if (n === 'my account' || n === 'my-account' || n === 'account') {
                  return `WooCommerce MY ACCOUNT page — build a Shopify-grade customer dashboard. Structure:
- Welcome header with customer name placeholder + account quick stats (orders, store credit, saved items).
- Left sidebar navigation (Dashboard, Orders, Addresses, Payment methods, Downloads, Account details, Logout).
- Main panel: recent orders table (order #, date, status pill, total, "View" link), tracking info, and a quick "Reorder" button per row.
- Below: saved addresses cards, saved payment methods cards, preferences section.
- Include the WooCommerce shortcode [woocommerce_my_account] inside a styled wrapper so the real account UI renders.
- Feel: calm, organised, Shopify-account-page polish.`;
                }
                if (n === 'single product' || n === 'single-product' || n === 'product') {
                  return `WooCommerce SINGLE PRODUCT template — the product-detail page shown when a shopper opens a product. Full design freedom for the layout, but the actual product content MUST render via native WooCommerce blocks. Structure suggestion (adapt freely):
- Two-column top section: LEFT = product gallery (main image + thumbnail strip, supports zoom), RIGHT = product title, price, short description, variation selector, quantity input, Add-to-cart, wishlist icon, SKU, categories, trust micro-badges.
- Product details tabs or accordion below: Description, Specifications, Shipping & Returns, Reviews.
- Related products section (4-col grid) using another Product Collection block filtered to related items.
- Trust strip (free shipping, returns, secure checkout, support).
Embed the official WooCommerce single-product blocks:
<!-- wp:woocommerce/single-product /-->
or for fine control, individual product blocks like:
<!-- wp:woocommerce/product-image-gallery /-->
<!-- wp:woocommerce/product-details /-->
<!-- wp:woocommerce/add-to-cart-form /-->
<!-- wp:woocommerce/product-meta /-->
Wrap these in your own styled sections so the page feels bespoke. Feel: Shopify-product-page polish.`;
                }
                if (n === 'blog' || n === 'blog-archive' || n === 'articles' || n === 'news') {
                  return `BLOG ARCHIVE page — the page that lists all blog posts. Full design freedom for the editorial layout. Typical structure (adapt freely):
- Editorial hero with the blog name, a tagline, and maybe a featured post.
- Category / tag filter pills.
- Masonry or asymmetric grid of post cards (featured image, category tag, title, excerpt, author + date, reading time).
- Featured/sticky post with larger treatment.
- Newsletter signup section near the bottom.
Use the WordPress Query Loop block for the actual posts list so real posts render:
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
<!-- /wp:query -->
Style the surrounding sections however you want.`;
                }
                if (n === 'single post' || n === 'single-post' || n === 'post') {
                  return `SINGLE POST template — the template used to render individual blog posts. Full design freedom for the reading layout. Suggested structure:
- Hero section: featured image, category pill, title, author + date + reading time + share icons.
- Content column centred at reading width (~620-720px) with strong typography, pull quotes, image captions.
- Sidebar or floating table-of-contents (desktop only).
- Author bio card at end (avatar, bio, link to archive).
- Related posts grid (3-col) at the bottom.
- Newsletter / CTA section.
Use the core Gutenberg post blocks so real post content renders:
<!-- wp:post-title /-->
<!-- wp:post-featured-image /-->
<!-- wp:post-date /-->
<!-- wp:post-author-name /-->
<!-- wp:post-content /-->
<!-- wp:post-terms {"term":"category"} /-->
<!-- wp:comments /-->
Feel: premium editorial like Medium / Substack.`;
                }
                if (n === '404' || n === 'not found' || n === '404 not found') {
                  return `404 "Not Found" template — shown when a visitor hits a URL that doesn't exist. Keep it human and helpful. Suggested elements:
- Large "404" typography (could be decorative or integrated into a witty illustration/wordmark).
- Empathetic headline ("Looks like this page took a wrong turn" — match brand voice).
- Short helpful paragraph.
- Primary CTA back to home + secondary to a search box.
- A small row of links to popular destinations (Shop, About, Contact, Blog if relevant).
- Optional: include a WordPress Search block so visitors can search directly:
<!-- wp:search {"label":"Try searching","buttonText":"Search"} /-->
Feel: on-brand, brief, never punishing.`;
                }
                if (n === 'search results' || n === 'search' || n === 'search-results') {
                  return `SEARCH RESULTS template — shown when a visitor runs a site search. Full design freedom. Suggested structure:
- Hero band with a Search block (pre-populated with the current query) and a result count.
- Filter/sort row (post type tabs if there are products, date, relevance).
- Results list/grid using the Query Loop block with 'inherit':true so it picks up the search query:
<!-- wp:query {"queryId":0,"query":{"perPage":12,"pages":0,"offset":0,"postType":"post","inherit":true}} -->
<div class="wp-block-query">
  <!-- wp:post-template -->
  <!-- wp:post-title {"isLink":true,"level":3} /-->
  <!-- wp:post-excerpt /-->
  <!-- wp:post-date /-->
  <!-- /wp:post-template -->
  <!-- wp:query-no-results>
    <p>No results — try a different search.</p>
  <!-- /wp:query-no-results -->
  <!-- wp:query-pagination>
    <!-- wp:query-pagination-previous /-->
    <!-- wp:query-pagination-numbers /-->
    <!-- wp:query-pagination-next /-->
  <!-- /wp:query-pagination>
</div>
<!-- /wp:query -->
- An empty-state design for no results (witty copy + links to popular pages).
- Trust/footer CTA row.
Feel: utilitarian but polished.`;
                }
                return null;
              };
              const newPages = pageNames.map((name: string, i: number) => ({
                id: localId(),
                title: name,
                slug: name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `page-${i + 1}`,
                prompt: specialPagePrompt(name) || `${name} page for this website. Concept: ${selectedConcept}`,
                sort_order: i,
                html: '',
                sections: [] as Array<{ id: string; title: string; description: string }>,
              }));
              setPages(newPages);
              if (newPages.length > 0) setSelectedPageId(newPages[0].id);

              // Reference HTML takes priority over the brief for global styles
              if (referenceHtml) {
                const extracted = extractStylesFromHtml(referenceHtml);
                if (extracted.colors || extracted.fonts) {
                  setStyleConfig((prev: any) => ({
                    ...prev,
                    ...(extracted.colors && { colors: { ...(prev.colors || {}), ...extracted.colors } }),
                    ...(extracted.fonts && { fonts: { ...(prev.fonts || {}), ...extracted.fonts } }),
                    mode: 'custom',
                    presetId: undefined,
                    seededFromReferenceHtml: true,
                  }));
                }
              }

              setStep(2);
            }}
            onDismissImportSummary={() => setImportedSummary(null)}
            onSelect={() => {
              // Concepts are rewrites now — they replace brief text via the
              // component's own handler. Nothing to do here.
            }}
          />
        )}
        {step === 2 && (
          <StepDesign
            projectId=""
            brief={briefOptions[selectedBrief ?? 0]?.description || brief}
            styleConfig={styleConfig}
            pages={pages}
            selectedPageId={selectedPageId}
            businessInfo={businessInfo}
            onStyleChange={setStyleConfig}
            onPagesChange={setPages}
            onSelectPage={setSelectedPageId}
            onContinue={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <StepExport
            projectId=""
            project={{ name: projectName || 'Theme', slug: (projectName || 'theme').toLowerCase().replace(/[^a-z0-9]+/g, '-') }}
            styleConfig={styleConfig}
            pages={pages}
            businessInfo={businessInfo}
            onBack={() => setStep(2)}
          />
        )}
      </div>
    </div>
  );
}
