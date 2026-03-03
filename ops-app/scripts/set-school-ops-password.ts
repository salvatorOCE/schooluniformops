/**
 * Set or update the ops portal password for a school.
 * Run after applying the school_ops_credentials migration.
 *
 * Usage: npx ts-node scripts/set-school-ops-password.ts [SCHOOL_CODE] [PASSWORD]
 * Example: npx ts-node scripts/set-school-ops-password.ts WARRADALE Warradale123
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
import dotenv from 'dotenv';
import path from 'path';

const cwd = process.cwd();
// Load env: try ops-app .env.local and .env, then parent .env (workspace root)
dotenv.config({ path: path.resolve(cwd, '.env.local') });
dotenv.config({ path: path.resolve(cwd, '.env') });
dotenv.config({ path: path.resolve(cwd, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to ops-app/.env.local or the workspace .env and run this script from the ops-app folder.');
  process.exit(1);
}

async function main() {
  const bcrypt = await import('bcryptjs');
  const { createClient } = await import('@supabase/supabase-js');

  const schoolCode = (process.argv[2] || 'WARRADALE').trim().toUpperCase();
  const password = process.argv[3] || 'Warradale123';

  const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

  // Try exact code match first, then case-insensitive (fetch all and match)
  let school: { id: string; code: string } | null = null;
  const { data: exact } = await supabase
    .from('schools')
    .select('id, code')
    .eq('code', schoolCode)
    .maybeSingle();
  if (exact?.id) school = { id: exact.id, code: exact.code || schoolCode };

  if (!school?.id) {
    const { data: allSchools } = await supabase
      .from('schools')
      .select('id, code, name')
      .order('code');
    const normalized = schoolCode.toUpperCase();
    const match = (allSchools || []).find(
      (s: { code: string }) => (s.code || '').toUpperCase() === normalized
    );
    if (match) school = { id: match.id, code: match.code };
  }

  if (!school?.id) {
    const { data: allSchools } = await supabase
      .from('schools')
      .select('id, code, name')
      .order('code');
    console.error(`No school found with code "${schoolCode}".`);
    if (allSchools?.length) {
      console.error('Schools in your database (use one of these codes):');
      allSchools.forEach((s: { code: string; name: string }) =>
        console.error(`  - ${s.code}  (${s.name})`)
      );
      console.error('Example: npx ts-node scripts/set-school-ops-password.ts <CODE> Warradale123');
    } else {
      console.error('Your schools table is empty. Add a school in Supabase first (Table Editor → schools).');
    }
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(password, 10);

  const { error: upsertErr } = await supabase
    .from('school_ops_credentials')
    .upsert(
      { school_id: school.id as string, password_hash, updated_at: new Date().toISOString() },
      { onConflict: 'school_id' }
    );

  if (upsertErr) {
    console.error('Failed to set password:', upsertErr.message);
    process.exit(1);
  }

  console.log(`Ops password set for school ${school.code}. Use password "${password}" to log in.`);
}

main();
