import { NextRequest, NextResponse } from 'next/server';
import { extractProductDescription } from '@/lib/extract-product-description';

/**
 * POST /api/firecrawl-scrape
 * Body: { url: string }
 * Scrapes the URL with Firecrawl and returns only the extracted product description.
 * Used by Bulk edit (and anywhere that needs description text without a garment id).
 */
export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }
  const url = body.url?.trim();
  if (!url || !url.startsWith('http')) {
    return NextResponse.json(
      { error: 'A valid URL is required in the request body.' },
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
    const doc = await app.scrape(url, { formats: ['markdown'] });
    const rawMarkdown = (doc as { markdown?: string }).markdown?.trim() ?? '';
    if (!rawMarkdown) {
      return NextResponse.json(
        { error: 'No text content could be extracted from that URL.' },
        { status: 422 }
      );
    }
    const description = extractProductDescription(rawMarkdown);
    return NextResponse.json({ description });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[firecrawl-scrape]', msg);
    return NextResponse.json(
      { error: msg || 'Scrape failed.' },
      { status: 500 }
    );
  }
}
