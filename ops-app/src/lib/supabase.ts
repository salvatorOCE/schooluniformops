import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

/** Only create client when URL is valid (avoids build-time errors when env is missing on Netlify/CI) */
function isValidSupabaseUrl(url: string): boolean {
  return url.length > 0 && (url.startsWith('https://') || url.startsWith('http://'));
}

export const supabase = (isValidSupabaseUrl(supabaseUrl) && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Use this for server-side operations that bypass RLS (like Webhooks)
// Only initialize if the key is present to prevent client-side errors
export const supabaseAdmin = (isValidSupabaseUrl(supabaseUrl) && supabaseServiceKey)
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;
