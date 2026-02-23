import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

const ParsedItemSchema = z.object({
    productName: z.string(),
    size: z.string(),
    quantity: z.number().int().min(1),
    sku: z.string().optional(),
    price: z.number().min(0).optional(),
});

const ResponseSchema = z.object({
    items: z.array(ParsedItemSchema),
    customerName: z.string().optional(),
    departmentOrAttention: z.string().optional(),
});

function extractJson(text: string): string {
    const trimmed = text.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return trimmed;
    return trimmed.slice(start, end + 1);
}

export async function POST(req: Request) {
    const hasKey = Boolean(process.env.OPENAI_API_KEY);
    console.log('[parse-email] POST received, OPENAI_API_KEY present:', hasKey);
    if (!hasKey) {
        return Response.json(
            { error: 'OPENAI_API_KEY is not set. Add it to .env.local and restart the dev server.' },
            { status: 500 }
        );
    }
    try {
        const body = await req.json();
        const text = body?.text;
        if (!text || typeof text !== 'string') {
            console.log('[parse-email] Missing or invalid text');
            return Response.json({ error: 'Missing or invalid "text"' }, { status: 400 });
        }
        console.log('[parse-email] Calling OpenAI...');
        const { text: rawResponse } = await generateText({
            model: openai('gpt-4o-mini'),
            system: `You extract school uniform / bulk order line items and contact details from pasted emails.

**Line items:** The email often lists a product name on one line, then one or more lines like "Size X x Y" meaning size X and quantity Y. Apply the product name to each following "Size X x Y" until the next product name or end of list.
- Example: "POLOS" then "Size 14 x 20" and "Size 8 x 10" → two items: POLOS size 14 qty 20, POLOS size 8 qty 10.
- Example: "Jacket" then "Size 6 x 14" → one item: Jacket size 6 qty 14.

**Output:** Reply with ONLY a single JSON object, no other text or markdown. Use this exact shape:
{"items":[{"productName":"...","size":"...","quantity":N}],"customerName":"...","departmentOrAttention":"..."}
- items: array of { productName (string), size (string), quantity (number) }. Optional per item: sku, price.
- customerName: contact person name from sign-off (e.g. "Sarah Spraakman").
- departmentOrAttention: job title or department (e.g. "Business Manager").`,
            prompt: `Extract all order line items and the contact name/title from this email. Reply with only the JSON object.\n\n${text.slice(0, 8000)}`,
        });

        const jsonStr = extractJson(rawResponse || '');
        let parsed: unknown;
        try {
            parsed = JSON.parse(jsonStr);
        } catch {
            console.error('[parse-email] Invalid JSON:', jsonStr.slice(0, 200));
            return Response.json({ error: 'AI did not return valid JSON. Try again.' }, { status: 500 });
        }

        const result = ResponseSchema.safeParse(parsed);
        if (!result.success) {
            console.error('[parse-email] Schema validation failed:', result.error.message);
            return Response.json({ error: 'AI response format was invalid. Try again.' }, { status: 500 });
        }

        const { items, customerName, departmentOrAttention } = result.data;
        if (!Array.isArray(items) || items.length === 0) {
            return Response.json({ error: 'No order items found in the email.' }, { status: 500 });
        }

        console.log('[parse-email] Success, items:', items.length);
        return Response.json({
            items,
            customerName: customerName ?? undefined,
            departmentOrAttention: departmentOrAttention ?? undefined,
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Parse failed';
        console.error('[parse-email] Error:', message, e);
        const friendlyMessage =
            /^(model:|[\w.-]+)$/i.test(message) || /claude|haiku|gpt/i.test(message)
                ? 'Parse failed. Check your AI API key in .env.local and try again.'
                : message.slice(0, 300);
        return Response.json({ error: friendlyMessage }, { status: 500 });
    }
}
