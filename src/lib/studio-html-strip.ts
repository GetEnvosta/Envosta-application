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

/** Strip site-wide chrome (header, nav, footer) from an uploaded page.
 *
 * Intentionally conservative: only removes elements that look like SITE
 * chrome (direct children of <body>, or explicitly marked as banner /
 * contentinfo / site-header / site-footer). In-page <nav>/card "headers"
 * are preserved so the rebuild matches the uploaded layout as closely
 * as possible.
 */
export function stripToPageContent(html: string): string {
  if (typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;
  if (!body) return html;

  // 1. Remove explicit site-chrome landmarks anywhere in the tree.
  body.querySelectorAll('.site-header, #site-header, .site-footer, #site-footer, [role="banner"], [role="contentinfo"]')
    .forEach(el => el.remove());

  // 2. Remove <header> / <footer> / <nav> elements only when they are
  //    DIRECT children of <body> (or direct children of a wrapper that is
  //    itself a direct child of body — many sites use <div id="page">
  //    or <div class="wrapper"> as the outermost container).
  const isSiteChrome = (el: Element): boolean => {
    const parent = el.parentElement;
    if (!parent) return false;
    if (parent === body) return true;
    if (parent.parentElement === body) {
      // Only consider this site chrome if the wrapper itself looks like
      // a site shell — e.g. the parent has no siblings of content.
      const siblingCount = parent.children.length;
      if (siblingCount <= 6) return true;
    }
    return false;
  };
  Array.from(body.querySelectorAll('header, footer, nav')).forEach(el => {
    if (isSiteChrome(el)) el.remove();
  });

  return wrapDoc(body.innerHTML.trim(), collectHeadAssets(doc));
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
