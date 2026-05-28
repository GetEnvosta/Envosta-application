/**
 * Input-sanitization helpers used to guard against two specific abuse
 * vectors found in the codebase:
 *
 *   1. PostgREST `.or()` filter injection
 *      — `.or()` interpolates raw strings using `,()*` as its filter
 *      grammar separators. A malicious caller can smuggle additional
 *      predicates by including those characters in their search input.
 *      Strip them.
 *
 *   2. Stored HTML XSS via outbound emails
 *      — Form fields (contact, intake, signup) end up in Resend HTML
 *      bodies. Without escaping, `<img src=x onerror=...>` in a name
 *      field would execute in an admin's webmail. Escape on the way in.
 */

/**
 * Strip PostgREST filter grammar characters from a search input and
 * cap length. Use the return value when interpolating into `.or(...)`
 * or `.ilike(...)` patterns.
 */
export function sanitizeSearchQuery(input: unknown, maxLen = 100): string {
  if (input == null) return '';
  const s = String(input);
  return s.replace(/[,()*.]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

/**
 * HTML-escape an untrusted string for safe interpolation into an email
 * body or any HTML-rendered surface. Escapes the five characters
 * Mozilla recommends: `& < > " '`.
 */
export function escapeHtml(input: unknown): string {
  if (input == null) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
