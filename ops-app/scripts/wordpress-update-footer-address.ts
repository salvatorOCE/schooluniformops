/**
 * Find "Head office location" (or similar) in WordPress pages and replace with new address.
 * Run from ops-app: npx ts-node scripts/wordpress-update-footer-address.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const BASE = (process.env.WORDPRESS_URL ?? process.env.WOO_URL)?.replace(/\/$/, '');
const USER = process.env.WORDPRESS_USERNAME;
const APP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;

const missing: string[] = [];
if (!BASE) missing.push('WORDPRESS_URL or WOO_URL');
if (!USER) missing.push('WORDPRESS_USERNAME');
if (!APP_PASSWORD) missing.push('WORDPRESS_APP_PASSWORD');
if (missing.length) {
  console.error('Missing in .env.local:', missing.join(', '));
  process.exit(1);
}

const auth = Buffer.from(`${USER}:${APP_PASSWORD!.replace(/\s/g, '')}`).toString('base64');
const headers = {
  Authorization: `Basic ${auth}`,
  'Content-Type': 'application/json',
};

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`${path} ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function patch(path: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} ${res.status} ${res.statusText} ${text.slice(0, 200)}`);
  }
  return res.json();
}

type Page = {
  id: number;
  title?: { rendered?: string };
  slug?: string;
  content?: { rendered?: string; raw?: string };
};

const NEW_ADDRESS = '209 Grand Junction Road';

async function main() {
  // Fetch all published pages with content (per_page max 100)
  const pages = await get<Page[]>('/wp-json/wp/v2/pages?per_page=100&status=publish&context=edit');
  const searchTerms = ['Head office location', 'Head office', 'head office location', 'head office'];
  let updated = false;

  for (const page of pages) {
    const raw = page.content?.raw ?? page.content?.rendered ?? '';
    const rendered = page.content?.rendered ?? '';
    const content = raw.length >= rendered.length ? raw : rendered; // prefer raw for editing
    if (!content) continue;

    let newContent = content;
    let found = false;
    for (const term of searchTerms) {
      if (content.includes(term)) {
        // Replace the label/section with the new address (keep possible HTML/structure)
        newContent = newContent.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), NEW_ADDRESS);
        found = true;
      }
    }
    // Also try replacing common "address" pattern: text that might be the actual address line
    if (!found && /head\s*office/i.test(content)) {
      // Replace any line or element that contains "head office" and an address-like string
      newContent = content.replace(/(Head\s*office\s*(?:location)?\s*:?\s*)[^<]+/gi, `$1${NEW_ADDRESS}`);
      if (newContent !== content) found = true;
    }

    if (found && newContent !== content) {
      console.log(`Updating page: ${page.title?.rendered ?? page.slug} (id=${page.id})`);
      await patch(`/wp-json/wp/v2/pages/${page.id}`, { content: newContent });
      updated = true;
    }
  }

  if (!updated) {
    // Search in rendered content for exact phrase to see what's there
    console.log('No page content contained "Head office". Checking template parts / full content...');
    for (const page of pages) {
      const c = (page.content?.rendered ?? page.content?.raw ?? '').toLowerCase();
      if (c.includes('head') && c.includes('office')) {
        console.log(`  Possible match in: ${page.title?.rendered ?? page.slug} (id=${page.id})`);
        const snippet = (page.content?.rendered ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        const idx = snippet.toLowerCase().indexOf('head');
        if (idx >= 0) console.log('    Snippet:', snippet.slice(Math.max(0, idx - 10), idx + 80));
      }
    }
  } else {
    console.log('Done. Footer address updated to:', NEW_ADDRESS);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
