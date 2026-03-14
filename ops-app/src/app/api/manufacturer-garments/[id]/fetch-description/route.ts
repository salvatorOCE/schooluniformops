import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractProductDescription } from '@/lib/extract-product-description';

/**
 * POST /api/manufacturer-garments/[id]/fetch-description
 * Body: { url?: string } — product page URL to scrape (or use garment's extra.product_url).
 * Uses Firecrawl to scrape the URL and save the markdown content to extra.description.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  let body: { url?: string };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const { data: garment, error: fetchErr } = await supabaseAdmin
    .from('manufacturer_garments')
    .select('id, extra')
    .eq('id', id)
    .single();
  if (fetchErr || !garment) {
    return NextResponse.json({ error: 'Garment not found' }, { status: 404 });
  }

  const url = (body.url && body.url.trim()) || (garment.extra as { product_url?: string } | null)?.product_url;
  if (!url || !url.startsWith('http')) {
    return NextResponse.json(
      { error: 'Provide a product URL in the request body, or save a Product URL on the garment first.' },
      { status: 400 }
    );
  }

  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'FIRECRAWL_API_KEY not set. Add it to .env.local to fetch descriptions.' },
      { status: 503 }
    );
  }

  try {
    const Firecrawl = (await import('@mendable/firecrawl-js')).default;
    const app = new Firecrawl({ apiKey });
    const doc = await app.scrape(url, { formats: ['markdown'] });
    const rawMarkdown = (doc as { markdown?: string }).markdown?.trim() ?? '';
    if (!rawMarkdown) {
      return NextResponse.json(
        { error: 'No text content could be extracted from that URL.' },
        { status: 422 }
      );
    }
    const description = extractProductDescription(rawMarkdown);

    const extra = (garment.extra as Record<string, unknown>) ?? {};
    const updatedExtra = {
      ...extra,
      description,
      product_url: url,
    };

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('manufacturer_garments')
      .update({ extra: updatedExtra })
      .eq('id', id)
      .select('id, name, image_url, created_at, manufacturer_name, code, price, garment_type, extra')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[fetch-description]', msg);
    return NextResponse.json(
      { error: msg || 'Failed to fetch or save description.' },
      { status: 500 }
    );
  }
}
