/**
 * Discover what's on the WordPress site via REST API (posts, pages, types, routes).
 * Run from ops-app: npx ts-node scripts/wordpress-discovery.ts
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
const headers = { Authorization: `Basic ${auth}` };

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`${path} ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function main() {
  const report: Record<string, unknown> = {};

  // Site info
  const root = await get<{ name?: string; url?: string; namespaces?: string[]; routes?: Record<string, { namespace?: string }> }>('/wp-json');
  report.site = { name: root.name, url: root.url };
  report.namespaces = root.namespaces ?? [];

  // Post types (core + custom from themes/plugins)
  try {
    const types = await get<Record<string, { slug?: string; name?: string; rest_base?: string; description?: string }>>('/wp-json/wp/v2/types');
    report.post_types = Object.entries(types).map(([key, t]) => ({
      slug: key,
      name: t.name,
      rest_base: t.rest_base,
      description: (t.description ?? '').slice(0, 80),
    }));
  } catch {
    report.post_types = [];
  }

  // Who am I
  try {
    const me = await get<{ id?: number; name?: string; slug?: string; roles?: string[] }>('/wp-json/wp/v2/users/me');
    report.authenticated_as = { id: me.id, name: me.name, slug: me.slug, roles: me.roles };
  } catch {
    report.authenticated_as = null;
  }

  // Recent posts
  try {
    const posts = await get<Array<{ id: number; title?: { rendered?: string }; slug?: string; status?: string; date?: string }>>('/wp-json/wp/v2/posts?per_page=10&_fields=id,title,slug,status,date');
    report.posts = posts.map((p) => ({ id: p.id, title: p.title?.rendered ?? p.slug, slug: p.slug, status: p.status, date: p.date }));
  } catch {
    report.posts = [];
  }

  // Pages
  try {
    const pages = await get<Array<{ id: number; title?: { rendered?: string }; slug?: string; status?: string }>>('/wp-json/wp/v2/pages?per_page=20&_fields=id,title,slug,status');
    report.pages = pages.map((p) => ({ id: p.id, title: p.title?.rendered ?? p.slug, slug: p.slug, status: p.status }));
  } catch {
    report.pages = [];
  }

  // Media count
  try {
    const media = await get<Array<{ id: number }>>('/wp-json/wp/v2/media?per_page=1');
    const mediaTotal = await fetch(`${BASE}/wp-json/wp/v2/media?per_page=1`, { headers }).then((r) => r.headers.get('X-WP-Total'));
    report.media_count = mediaTotal ?? (media.length > 0 ? '1+' : 0);
  } catch {
    report.media_count = null;
  }

  // Custom routes (non-wp, non-wc) – sample from root.routes
  const customRoutes = root.routes
    ? Object.entries(root.routes)
        .filter(([route]) => !route.startsWith('/wp/v2') && !route.startsWith('/wc/') && route !== '/' && !route.startsWith('/oembed'))
        .slice(0, 30)
    : [];
  report.custom_routes_sample = customRoutes.map(([route, meta]) => ({ route, namespace: (meta as { namespace?: string }).namespace }));

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
