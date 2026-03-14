/**
 * Verify WordPress REST API connection using WORDPRESS_URL + Application Password.
 * Run from ops-app: npx ts-node scripts/check-wordpress-api.ts
 *
 * Requires in .env.local:
 *   WORDPRESS_URL          - e.g. https://yoursite.com (no trailing slash)
 *   WORDPRESS_USERNAME     - your WordPress login username
 *   WORDPRESS_APP_PASSWORD - the Application Password from Users → Profile
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// WORDPRESS_URL or WOO_URL (same site); WORDPRESS_USERNAME; WORDPRESS_APP_PASSWORD
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

async function main() {
  const url = `${BASE}/wp-json`;
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    console.error(`WordPress API check failed: ${res.status} ${res.statusText}`);
    const text = await res.text();
    if (text) console.error(text.slice(0, 500));
    process.exit(1);
  }

  const json = (await res.json()) as { name?: string; description?: string; url?: string };
  console.log('WordPress REST API OK');
  console.log('  Site:', json.name ?? '(no name)');
  console.log('  URL:', json.url ?? BASE);
  if (json.description) console.log('  Description:', json.description);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
