import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ensureReplicateEnv } from '@/lib/load-env-local';

/**
 * GET /api/env-check
 * Returns whether the server has Supabase configured and REPLICATE_API_TOKEN set (for generate-pdf-with-logo stitch).
 * replicateKeys: list of env key names containing "REPLICATE" (so you can spot typos; values never sent).
 */
export async function GET() {
  ensureReplicateEnv();
  const configured = Boolean(supabaseAdmin);
  const replicateTokenSet = Boolean(process.env.REPLICATE_API_TOKEN?.trim());
  const replicateKeys = Object.keys(process.env).filter((k) => k.toUpperCase().includes('REPLICATE'));
  return NextResponse.json({ configured, replicateTokenSet, replicateKeys });
}
