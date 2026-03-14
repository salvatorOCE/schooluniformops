/**
 * Vision step: send page image to Claude, get back regions (logo_placeholder or garment with bbox).
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { z } from 'zod';

const regionSchema = z.object({
    type: z.enum(['logo_placeholder', 'garment']),
    bbox: z
        .object({
            x: z.number().min(0).max(1),
            y: z.number().min(0).max(1),
            width: z.number().min(0).max(1),
            height: z.number().min(0).max(1),
        })
        .optional(),
});

export const pageRegionsSchema = z.array(regionSchema);

export type PageRegion = z.infer<typeof regionSchema>;

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' });

/** Prompt for hybrid flow: garment bbox = ENTIRE product image (for crop → stitch API → paste back). */
const PAGE_PROMPT_HYBRID = `You are looking at ONE full page of a school uniform proposal PDF (rendered as an image). The page may contain product photos (garment images), text (titles, FABRIC, STYLE FEATURES), and decorative graphics.

Identify regions for the school logo. CRITICAL: Do NOT include any region that overlaps product text (titles, FABRIC, STYLE FEATURES bullet points).

1. **garment**: For EACH actual PHOTO of clothing (polo, shirt, jumper, blazer) on the page, return ONE region with type "garment" and a bbox (normalized 0-1) of the **ENTIRE garment product image** — the full photo of that single item (e.g. the whole polo, the whole jumper). The bbox must cover only that product image, not the text beside it. Typical size: 0.2–0.45 of page width, similar aspect (e.g. width 0.25–0.4, height 0.2–0.35). If there are two garment photos, return TWO garment regions.

2. **logo_placeholder**: Any dedicated logo area: a box with "LOGO HERE" or similar text, a blank logo box, or an isolated "logo here" graphic. Return type "logo_placeholder" and a bbox (normalized 0-1) covering that entire area. Do NOT return regions that overlap product body text (FABRIC, STYLE FEATURES). On cover or intro pages, if you see "LOGO HERE", return it as logo_placeholder with its full bbox.

Return a JSON array. Each item MUST have both "type" and "bbox": { "type": "logo_placeholder" | "garment", "bbox": { "x", "y", "width", "height" } }. Both logo_placeholder and garment require a bbox (normalized 0-1). If there are no safe regions, return [].
Return ONLY valid JSON, no markdown or explanation.`;

const PAGE_PROMPT = PAGE_PROMPT_HYBRID;

function extractJson(text: string): string {
    const trimmed = text.trim();
    const start = trimmed.indexOf('[');
    if (start === -1) return '[]';
    let depth = 0;
    let end = -1;
    for (let i = start; i < trimmed.length; i++) {
        if (trimmed[i] === '[') depth++;
        if (trimmed[i] === ']') {
            depth--;
            if (depth === 0) {
                end = i;
                break;
            }
        }
    }
    return end >= 0 ? trimmed.slice(start, end + 1) : '[]';
}

export async function getRegionsForPageImage(
    pageImageBuffer: Buffer,
    systemPrompt: string
): Promise<PageRegion[]> {
    const base64 = pageImageBuffer.toString('base64');
    const mime = 'image/png';

    const { text } = await generateText({
        model: anthropic('claude-sonnet-4-20250514'),
        system: systemPrompt,
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: PAGE_PROMPT },
                    { type: 'image', image: base64, mediaType: mime },
                ],
            },
        ],
    });

    const jsonStr = extractJson(text);
    const parsed = JSON.parse(jsonStr) as unknown;
    return pageRegionsSchema.parse(Array.isArray(parsed) ? parsed : []);
}
