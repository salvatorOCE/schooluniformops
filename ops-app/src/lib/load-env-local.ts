import path from 'path';
import { readFileSync, existsSync } from 'fs';

let loaded = false;

/**
 * Ensure REPLICATE_API_TOKEN is available. Next loads .env from the app root (where next dev runs).
 * If the server is started from the repo root, that's the parent of ops-app, so ops-app/.env.local
 * is never loaded. This tries loading .env and .env.local from cwd and from cwd/ops-app so the token is found
 * when run from either directory (e.g. token in repo root .env).
 */
export function ensureReplicateEnv(): void {
  if (process.env.REPLICATE_API_TOKEN?.trim()) return;
  if (loaded) return;
  loaded = true;
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, '.env.local'),
    path.join(cwd, '.env'),
    path.join(cwd, 'ops-app', '.env.local'),
    path.join(cwd, 'ops-app', '.env'),
  ];
  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue;
    try {
      const content = readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const m = line.match(/^\s*REPLICATE_API_TOKEN\s*=\s*(.+?)\s*$/);
        if (m) {
          const value = m[1].replace(/^["']|["']$/g, '').trim();
          if (value) process.env.REPLICATE_API_TOKEN = value;
          return;
        }
      }
    } catch {
      // ignore read/parse errors
    }
  }
}
