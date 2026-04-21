/**
 * Utilities for targeting and replacing a single section's block markup
 * inside a page of Gutenberg block HTML.
 *
 * A section, in studio terms, is the top-level <!-- wp:group --> (or
 * <!-- wp:cover -->) that the AI emits with an `anchor:"section-<id>"`
 * attribute. We find the opening comment by anchor, then walk forward
 * counting open/close block comments of the same block name to locate
 * the matching close, tolerating arbitrary nesting of other blocks
 * inside.
 */

export type SectionBounds = {
  /** Character offset of the first `<` in the opening comment */
  start: number;
  /** Character offset immediately AFTER the last `>` of the close comment */
  end: number;
  /** Block name without the wp: prefix, e.g. "group" or "cover" */
  blockName: string;
};

/** Escape a string for embedding in a regex. */
function reEscape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Locate the outer block that carries the given anchor attribute. Returns
 * null if no matching block is found (or if the HTML is unbalanced).
 *
 * Supports either form the AI may emit:
 *   <!-- wp:group {"anchor":"section-hero",...} -->
 *   <!-- wp:cover {"anchor":"section-hero","style":{...}} -->
 *
 * The block name is captured so we know which close comment to match.
 */
export function findSectionBlockBounds(html: string, anchorId: string): SectionBounds | null {
  if (!html || !anchorId) return null;

  // Opening comment: capture the block name (including namespace like
  // woocommerce/cart) and require the anchor attribute somewhere in the
  // JSON body. We tolerate any attribute order.
  const openingRe = new RegExp(
    `<!--\\s*wp:([a-z0-9/_-]+)\\s+(\\{[^}]*?"anchor"\\s*:\\s*"${reEscape(anchorId)}"[^}]*\\})\\s*-->`,
    'i',
  );
  const openMatch = openingRe.exec(html);
  if (!openMatch || openMatch.index === undefined) return null;

  const blockName = openMatch[1];
  const openStart = openMatch.index;
  const scanFrom = openMatch.index + openMatch[0].length;

  // Collect every open + close comment for this block name after the opener.
  // `wp:groupblock` etc. shouldn't match wp:group — use word boundary via
  // mandatory whitespace / brace / trailing `/` after the name.
  const openTagRe = new RegExp(`<!--\\s*wp:${reEscape(blockName)}(?=\\s|\\{|/)`, 'g');
  const closeTagRe = new RegExp(`<!--\\s*/wp:${reEscape(blockName)}\\s*-->`, 'g');

  type Tok = { pos: number; len: number; isOpen: boolean };
  const tokens: Tok[] = [];

  let m: RegExpExecArray | null;
  openTagRe.lastIndex = scanFrom;
  while ((m = openTagRe.exec(html)) !== null) {
    tokens.push({ pos: m.index, len: m[0].length, isOpen: true });
  }
  closeTagRe.lastIndex = scanFrom;
  while ((m = closeTagRe.exec(html)) !== null) {
    tokens.push({ pos: m.index, len: m[0].length, isOpen: false });
  }
  tokens.sort((a, b) => a.pos - b.pos);

  // Starting depth = 1 (our opener is already consumed).
  let depth = 1;
  for (const t of tokens) {
    depth += t.isOpen ? 1 : -1;
    if (depth === 0 && !t.isOpen) {
      return { start: openStart, end: t.pos + t.len, blockName };
    }
  }
  return null;
}

/**
 * Replace a single section's block markup inside a page of block HTML.
 * Returns the new html or null if the section couldn't be located (the
 * caller should fall back to a full-page regeneration in that case).
 */
export function replaceSectionBlock(
  html: string,
  anchorId: string,
  replacement: string,
): string | null {
  const bounds = findSectionBlockBounds(html, anchorId);
  if (!bounds) return null;
  return html.slice(0, bounds.start) + replacement.trim() + html.slice(bounds.end);
}

/**
 * Best-effort extraction of an anchor attribute from the first outer block
 * comment in a snippet. Used when the AI returns generated section markup —
 * we verify it self-identifies with the expected anchor before splicing.
 */
export function extractFirstAnchor(blockHtml: string): string | null {
  const m = blockHtml.match(/<!--\s*wp:[a-z0-9/_-]+\s+(\{[^}]*?"anchor"\s*:\s*"([^"]+)"[^}]*\})\s*-->/i);
  return m ? m[2] : null;
}

/**
 * Force-set the anchor attribute on the first outer block comment in a
 * snippet, adding it if missing. Used as a safety net when the model
 * forgets to include the anchor we requested.
 */
export function ensureAnchorOnFirstBlock(blockHtml: string, anchorId: string): string {
  const has = /<!--\s*wp:[a-z0-9/_-]+\s+\{[^}]*"anchor"\s*:\s*"[^"]*"[^}]*\}\s*-->/i.test(blockHtml);
  if (has) {
    // Replace whatever anchor is there with the requested one (normalisation).
    return blockHtml.replace(
      /(<!--\s*wp:[a-z0-9/_-]+\s+\{[^}]*?)"anchor"\s*:\s*"[^"]*"([^}]*\}\s*-->)/i,
      `$1"anchor":"${anchorId}"$2`,
    );
  }
  // Add anchor to the first block comment's JSON, or wrap if none.
  const firstCommentRe = /<!--\s*wp:([a-z0-9/_-]+)(\s+\{[^}]*\})?\s*-->/i;
  const m = firstCommentRe.exec(blockHtml);
  if (!m) return blockHtml;
  const hadJson = !!m[2];
  const jsonBody = hadJson ? m[2].trim() : '';
  const newJson = hadJson
    ? jsonBody.replace(/^\{/, `{"anchor":"${anchorId}",`)
    : `{"anchor":"${anchorId}"}`;
  const replacement = `<!-- wp:${m[1]} ${newJson} -->`;
  return blockHtml.replace(firstCommentRe, replacement);
}
