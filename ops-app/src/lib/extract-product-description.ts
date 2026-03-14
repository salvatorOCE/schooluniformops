/**
 * Extract only product description/features from full-page markdown (e.g. from Firecrawl).
 * Strips navigation, reviews, forms, cart buttons, etc. Works across different manufacturer sites.
 */

const DESCRIPTION_HEADERS =
  /^(features?|description|product details?|overview|key features?|details|product description|what'?s included|specifications?)\s*:?\s*$/i;

const STOP_HEADERS =
  /^(reviews?|related products?|add to (cart|wishlist|compare)|write your (own )?review|contact us|send us a message|subscribe|newsletter|your name\*?|your email\*?|subject\*?|enquiry\*?|rating\s*:?|submit (review|enquiry)|recaptcha|privacy|terms|welcome!|picture of |manufacturer\s*:?|sku\s*:?|availability\s*:?|colour\s*:?|size\s*:?|buy\s*$|call for pricing)/i;

const BOILERPLATE_LINE =
  /^(add to cart|buy now|call for pricing|subscribe|submit|recaptcha|protected by|do not show|please check the|email a friend|request a quote|add to wishlist|add to compare)/i;

/** Max lines to keep under a description section (avoids pulling in huge pages). */
const MAX_DESCRIPTION_LINES = 50;

/**
 * From full-page markdown, return only the product description/features section(s).
 * Looks for headings like "Features", "Description", "Product details", "Overview"
 * and returns the content under them, stopping at boilerplate (Reviews, Add to cart, etc.).
 */
export function extractProductDescription(markdown: string): string {
  if (!markdown?.trim()) return markdown ?? '';

  const lines = markdown.split(/\r?\n/);
  const collected: string[] = [];
  let inSection = false;
  let sectionLines = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    const lower = trimmed.toLowerCase();

    // Treat bold-only lines (e.g. "**Features:**") or short lines as possible headers
    const looksLikeHeader =
      /^#{1,4}\s/.test(trimmed) ||
      (/^\*\*[^*]+\*\*\s*:?\s*$/.test(trimmed) && trimmed.length < 80) ||
      (trimmed.length < 60 && /^[A-Za-z][A-Za-z\s]+:?\s*$/.test(trimmed));

    if (looksLikeHeader && trimmed) {
      const headerLabel = trimmed
        .replace(/^#{1,4}\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/\s*:\s*$/, '')
        .trim();

      if (STOP_HEADERS.test(headerLabel) || STOP_HEADERS.test(lower)) {
        inSection = false;
        continue;
      }
      if (DESCRIPTION_HEADERS.test(headerLabel) || DESCRIPTION_HEADERS.test(lower)) {
        inSection = true;
        sectionLines = 0;
        collected.push(trimmed);
        continue;
      }
      if (inSection) {
        inSection = false;
      }
      continue;
    }

    if (inSection) {
      if (BOILERPLATE_LINE.test(lower) || trimmed === '') {
        if (trimmed === '' && sectionLines > 0) {
          collected.push(raw);
        }
        continue;
      }
      if (sectionLines >= MAX_DESCRIPTION_LINES) break;
      collected.push(raw);
      sectionLines++;
    }
  }

  const result = collected.length ? collected.join('\n').trim() : '';
  if (result) return result;

  // Fallback: take first list or paragraph block before "Review" / "Add to"
  const fallback: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim().toLowerCase();
    if (/^(reviews?|write your|add to cart|subscribe|your name)/.test(trimmed)) break;
    if (fallback.length >= 25) break;
    if (trimmed || fallback.length > 0) fallback.push(lines[i]);
  }
  const fallbackResult = fallback.join('\n').trim();
  if (fallbackResult.length > 100) return fallbackResult;

  return markdown.slice(0, 2500).trim();
}
