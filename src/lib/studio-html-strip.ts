/**
 * Helpers for importing arbitrary HTML into studio pages.
 *
 * Uploads are parsed with DOMParser (browser-only) and reduced to the
 * relevant portion based on the destination:
 *   - Content page → strip <header>/<footer>/site-wide <nav>; keep page body
 *   - Header template part → extract just the <header> block
 *   - Footer template part → extract just the <footer> block
 *
 * Head <style> / Google Font <link> elements are preserved and moved
 * inline so the preview iframe still styles the content correctly.
 */

function collectHeadAssets(doc: Document): string {
  if (!doc?.head) return '';
  const styles = Array.from(doc.head.querySelectorAll('style')).map(s => s.outerHTML);
  const fontLinks = Array.from(
    doc.head.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"], link[rel="dns-prefetch"]')
  ).map(l => l.outerHTML);
  return [...fontLinks, ...styles].join('\n');
}

function wrapDoc(bodyInner: string, headExtras: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
${headExtras}
</head>
<body>
${bodyInner}
</body>
</html>`;
}

/** Strip site-wide chrome (header, nav, footer) from an uploaded page. */
export function stripToPageContent(html: string): string {
  if (typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;
  if (!body) return html;

  // Remove obvious site-wide chrome
  body.querySelectorAll('header').forEach(el => el.remove());
  body.querySelectorAll('footer').forEach(el => el.remove());
  body.querySelectorAll(
    '.site-header, #site-header, .site-footer, #site-footer, .header, .footer, [role="banner"], [role="contentinfo"]'
  ).forEach(el => el.remove());

  // Remove top-level navigation — a nav that isn't inside main content
  body.querySelectorAll('nav').forEach(el => {
    const insideContent = el.closest('main, article, [role="main"]');
    if (!insideContent) el.remove();
  });

  // Some exports nest content under main/article — prefer that if present
  const main = body.querySelector('main, [role="main"], article');
  const inner = main ? main.innerHTML : body.innerHTML;

  return wrapDoc(inner.trim(), collectHeadAssets(doc));
}

/** Extract only the site header from an uploaded page. */
export function stripToHeader(html: string): string {
  if (typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const candidate =
    doc.querySelector('header') ||
    doc.querySelector('.site-header, #site-header, [role="banner"]') ||
    doc.querySelector('nav');
  if (!candidate) return html;
  return wrapDoc(candidate.outerHTML, collectHeadAssets(doc));
}

/** Extract only the site footer from an uploaded page. */
export function stripToFooter(html: string): string {
  if (typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const candidate =
    doc.querySelector('footer') ||
    doc.querySelector('.site-footer, #site-footer, [role="contentinfo"]');
  if (!candidate) return html;
  return wrapDoc(candidate.outerHTML, collectHeadAssets(doc));
}

/** Pick the right stripper for a given page title. */
export function stripHtmlForPage(html: string, pageTitle: string): string {
  if (pageTitle === 'Header') return stripToHeader(html);
  if (pageTitle === 'Footer') return stripToFooter(html);
  return stripToPageContent(html);
}
