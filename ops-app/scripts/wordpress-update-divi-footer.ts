/**
 * Update Divi Theme Builder footer via SUS Divi REST plugin.
 * Requires: plugin "SUS Divi REST" installed and activated on the WordPress site.
 * Run from ops-app: npx ts-node scripts/wordpress-update-divi-footer.ts [find] [replace]
 * Default: find="Head office location", replace="209 Grand Junction Road"
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

const auth = Buffer.from(`${USER}:${APP_PASSWORD!.replace(/\s/g, '')}`).toString('base64');
const headers = {
  Authorization: `Basic ${auth}`,
  'Content-Type': 'application/json',
};

const findText = process.argv[2] ?? 'Head office location';
const replaceText = process.argv[3] ?? '209 Grand Junction Road';

async function main() {
  const url = `${BASE}/wp-json/sus-divi/v1/footer`;
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
    console.log('Footer updated:', data.message);
    console.log('  Find:', findText);
    console.log('  Replace:', replaceText);
  } else {
    console.log(data.message ?? data);
    if (data.ids_checked?.length) console.log('  Checked layout IDs:', data.ids_checked);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
