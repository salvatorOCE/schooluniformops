import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/env-check
 * Returns whether the server has Supabase configured (used to show a banner when data won't load).
 */
export async function GET() {
  const configured = Boolean(supabaseAdmin);
  return NextResponse.json({ configured });
}
