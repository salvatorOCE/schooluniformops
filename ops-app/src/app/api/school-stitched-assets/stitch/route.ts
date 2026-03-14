import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { stitchGarmentWithLogoFromUrls } from '@/lib/proposal-garment-stitch';

const BUCKET = 'school-stitched-assets';
const DELAY_BETWEEN_CALLS_MS = 12000; // stay under ~5/min; Replicate free tier is 6/min burst 1
const RETRY_DELAY_MS = 15000;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * POST /api/school-stitched-assets/stitch
 * Body: { school_id: string, logo_id?: string, garment_ids: string[] }
 * For each garment: stitch with school logo (original URL), upload result, insert row. Rate-limited.
 */
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  let body: { school_id?: string; logo_id?: string | null; garment_ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const schoolId = body.school_id;
  const logoId = body.logo_id ?? null;
  const garmentIds = Array.isArray(body.garment_ids) ? body.garment_ids : [];
  if (!schoolId || garmentIds.length === 0) {
    return NextResponse.json(
      { error: 'school_id and non-empty garment_ids required' },
      { status: 400 }
    );
  }

  let logoUrl: string | null = null;
  if (logoId && logoId !== 'legacy') {
    const { data: logo } = await supabaseAdmin
      .from('school_logos')
      .select('image_url')
      .eq('id', logoId)
      .eq('school_id', schoolId)
      .single();
    logoUrl = (logo as { image_url?: string } | null)?.image_url?.trim() ?? null;
  }
  if (!logoUrl) {
    const { data: school, error: schoolErr } = await supabaseAdmin
      .from('schools')
      .select('id, logo_url')
      .eq('id', schoolId)
      .single();
    if (schoolErr || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    logoUrl = (school as { logo_url?: string | null }).logo_url?.trim() ?? null;
  }
  if (!logoUrl) {
    return NextResponse.json(
      { error: 'School has no logo. Add a logo for this school first.' },
      { status: 400 }
    );
  }

  const { data: garments, error: garmentsErr } = await supabaseAdmin
    .from('manufacturer_garments')
    .select('id, name, code, image_url, garment_type')
    .in('id', garmentIds);
  if (garmentsErr || !garments?.length) {
    return NextResponse.json({ error: 'No valid garments found' }, { status: 400 });
  }

  const results: { garment_id: string; garment_name: string; ok: boolean; error?: string }[] = [];
  for (let i = 0; i < garments.length; i++) {
    const g = garments[i] as { id: string; name: string; code?: string | null; image_url: string; garment_type?: string | null };
    if (i > 0) await delay(DELAY_BETWEEN_CALLS_MS);

    const stitchOptions = { garmentType: g.garment_type ?? null, garmentName: g.name ?? null, garmentCode: g.code ?? null };
    let result = await stitchGarmentWithLogoFromUrls(g.image_url, logoUrl, stitchOptions);
    const isRetriable = !result.ok && result.error && /Prediction failed|timeout|overloaded/i.test(result.error);
    if (!result.ok && isRetriable) {
      await delay(RETRY_DELAY_MS);
      result = await stitchGarmentWithLogoFromUrls(g.image_url, logoUrl, stitchOptions);
    }
    if (!result.ok) {
      results.push({
        garment_id: g.id,
        garment_name: g.name,
        ok: false,
        error: result.error ?? 'Stitch failed',
      });
      continue;
    }
    const buf = result.image;
    const assetId = crypto.randomUUID();
    const path = `${schoolId}/${assetId}.png`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buf, { contentType: 'image/png', upsert: true });
    if (uploadError) {
      results.push({ garment_id: g.id, garment_name: g.name, ok: false, error: uploadError.message });
      continue;
    }
    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const { error: upsertError } = await supabaseAdmin
      .from('school_stitched_assets')
      .upsert(
        {
          id: assetId,
          school_id: schoolId,
          manufacturer_garment_id: g.id,
          image_url: urlData.publicUrl,
        },
        { onConflict: 'school_id,manufacturer_garment_id' }
      );
    if (upsertError) {
      results.push({ garment_id: g.id, garment_name: g.name, ok: false, error: upsertError.message });
      continue;
    }
    results.push({ garment_id: g.id, garment_name: g.name, ok: true });
  }

  return NextResponse.json({ results });
}
