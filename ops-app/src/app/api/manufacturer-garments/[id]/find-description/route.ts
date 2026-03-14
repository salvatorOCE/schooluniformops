import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractProductDescription } from '@/lib/extract-product-description';

/**
 * POST /api/manufacturer-garments/[id]/find-description
 * Uses Firecrawl to search for the garment by manufacturer + code, scrape the first result, and save description.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  const { data: garment, error: fetchErr } = await supabaseAdmin
    .from('manufacturer_garments')
    .select('id, name, manufacturer_name, code, extra')
    .eq('id', id)
    .single();
  if (fetchErr || !garment) {
    return NextResponse.json({ error: 'Garment not found' }, { status: 404 });
  }

  const mfr = (garment.manufacturer_name as string)?.trim() || '';
  const code = (garment.code as string)?.trim() || '';
  const name = (garment.name as string)?.trim() || '';
  const query = [mfr, code].filter(Boolean).join(' ') || name || 'garment';
  if (!query) {
    return NextResponse.json(
      { error: 'Add manufacturer and code (or name) to this garment so we can search for it.' },
      { status: 400 }
    );
  }

  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'FIRECRAWL_API_KEY not set. Add it to .env.local.' },
      { status: 503 }
    );
  }

  try {
    const Firecrawl = (await import('@mendable/firecrawl-js')).default;
    const app = new Firecrawl({ apiKey });

    const searchResult = await app.search(query, { limit: 5 });
    const web = (searchResult as { web?: Array<{ url?: string }> })?.web;
    const firstUrl = web?.[0]?.url;
    if (!firstUrl || !firstUrl.startsWith('http')) {
      return NextResponse.json(
        { error: `No product page found for "${query}". Try adding a Product URL manually.` },
        { status: 404 }
      );
    }

    const doc = await app.scrape(firstUrl, { formats: ['markdown'] });
    const rawMarkdown = (doc as { markdown?: string }).markdown?.trim() ?? '';
    if (!rawMarkdown) {
      return NextResponse.json(
        { error: 'Could not extract text from the found page.' },
        { status: 422 }
      );
    }
    const description = extractProductDescription(rawMarkdown);

    const extra = ((garment.extra as Record<string, unknown>) ?? {}) as Record<string, unknown>;
    const updatedExtra = {
      ...extra,
      description,
      product_url: firstUrl,
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
    const extraOut = (updated?.extra as { description?: string; product_url?: string } | null) ?? {};
    return NextResponse.json({
      ...updated,
      description: extraOut.description ?? '',
      product_url: extraOut.product_url ?? '',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[find-description]', msg);
    return NextResponse.json(
      { error: msg || 'Search or scrape failed.' },
      { status: 500 }
    );
  }
}
