/**
 * Update Divi Theme Builder footer, header, or body via SUS Divi REST plugin.
 * Requires: plugin "SUS Divi REST" v1.1+ installed and activated.
 *
 * Usage: npx ts-node scripts/wordpress-update-divi-layout.ts <area> [find] [replace]
 *   area: footer | header | body
 *   find: string to find (default: empty – use with replace for custom update)
 *   replace: string to replace with
 *
 * Examples:
 *   npm run update:divi-footer
 *   npx ts-node scripts/wordpress-update-divi-layout.ts footer "Old address" "New address"
 *   npx ts-node scripts/wordpress-update-divi-layout.ts header "Old phone" "0433 452 266"
 *   npx ts-node scripts/wordpress-update-divi-layout.ts body "Welcome" "Welcome to SUS"
 *
 * Uses WORDPRESS_URL/WOO_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD from .env.local
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

const validAreas = ['footer', 'header', 'body'];
const area = (process.argv[2] ?? 'footer').toLowerCase();
if (!validAreas.includes(area)) {
  console.error('Usage: <area> [find] [replace]  area must be: footer | header | body');
  process.exit(1);
}

const findText = process.argv[3] ?? '';
const replaceText = process.argv[4] ?? '';

const auth = Buffer.from(`${USER}:${APP_PASSWORD!.replace(/\s/g, '')}`).toString('base64');
const headers = {
  Authorization: `Basic ${auth}`,
  'Content-Type': 'application/json',
};

async function main() {
  if (!findText || replaceText === undefined) {
    console.log(`To update ${area}: pass find and replace. Example:`);
    console.log(`  npx ts-node scripts/wordpress-update-divi-layout.ts ${area} "text to find" "new text"`);
    const res = await fetch(`${BASE}/wp-json/sus-divi/v1/${area}`, { headers });
    const data = (await res.json()) as { footers?: unknown[]; headers?: unknown[]; bodies?: unknown[] };
    const key = area + 's';
    const items = (data as Record<string, unknown[]>)[key];
    if (res.ok && items?.length) {
      console.log(`  ${area} layout(s) found: ${items.length}. Use GET to inspect content.`);
    } else if (!res.ok) {
      console.log('  Response:', (data as { error?: string }).error ?? data);
    }
    return;
  }

  const url = `${BASE}/wp-json/sus-divi/v1/${area}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ find: findText, replace: replaceText }),
  });
  const data = (await res.json()) as { updated?: number[]; message?: string; error?: string; ids_checked?: number[] };
  if (!res.ok) {
    console.error('Error:', res.status, data.error ?? data);
    process.exit(1);
  }
  if (data.updated?.length) {
    console.log(area + ' updated:', data.message);
    console.log('  Find:', findText);
    console.log('  Replace:', replaceText);
  } else {
    console.log(data.message ?? JSON.stringify(data));
    if (data.ids_checked?.length) console.log('  Checked layout IDs:', data.ids_checked);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
