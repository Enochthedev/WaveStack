/**
 * Text sanitization utilities for user-supplied content.
 * Prevents XSS, script injection, and strips dangerous patterns.
 */

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#96;",
};

const HTML_ENTITY_RE = /[&<>"'`/]/g;

/** Escape HTML entities to prevent XSS when content is rendered in a browser. */
export function escapeHtml(str: string): string {
  return str.replace(HTML_ENTITY_RE, (char) => HTML_ENTITIES[char] || char);
}

/** Strip all HTML tags from a string. */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize user-supplied text: strip HTML, collapse whitespace, trim, and
 * enforce a max length. Use this on all user-facing text fields (titles,
 * captions, descriptions, usernames, etc.).
 */
export function sanitizeText(str: string, maxLength = 10_000): string {
  let clean = stripHtml(str);
  // Remove null bytes
  clean = clean.replace(/\0/g, "");
  // Collapse excessive whitespace
  clean = clean.replace(/\s{3,}/g, "  ");
  // Trim and enforce max length
  return clean.trim().slice(0, maxLength);
}

/** Sanitize a URL — only allow http/https protocols. */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validate and restrict a sort field to an allowed whitelist.
 * Prevents orderBy injection via unvalidated user query params.
 */
export function safeSortField<T extends string>(
  field: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (!field) return fallback;
  return allowed.includes(field as T) ? (field as T) : fallback;
}
