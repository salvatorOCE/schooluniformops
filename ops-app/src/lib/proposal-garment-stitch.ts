/**
 * Stitch step: send garment + logo to Replicate; prompt from content/stitch-embroidery-directive.md.
 * Uses Nano Banana 2 (better text rendering, instruction following, fidelity). Set REPLICATE_STITCH_MODEL to override.
 */

import path from 'path';

const DEFAULT_STITCH_MODEL = 'google/nano-banana-2';
import { readFileSync, existsSync } from 'fs';
import { ensureReplicateEnv } from './load-env-local';

export type StitchResult =
    | { ok: true; image: Buffer; fromApi?: boolean }
    | { ok: false; error: string };

export async function stitchGarmentWithLogo(
    garmentImageBuffer: Buffer,
    logoBuffer: Buffer,
    options?: StitchOptions
): Promise<StitchResult> {
    const result = await stitchViaReplicateNanoBanana(garmentImageBuffer, logoBuffer, options);
    if (result) return result;
    return { ok: true, image: garmentImageBuffer };
}

const FALLBACK_PROMPT = `You are editing a product photo of a garment (e.g. polo, shirt, jumper). 
Place the second image (the logo) on the wearer's right chest of the garment — that is the LEFT side of the garment from the viewer's perspective when looking at the front. 
Make it look like a small embroidered or printed badge: professional, clean, realistic. 
Keep the rest of the garment, lighting, and background exactly the same. 
Output a single photorealistic image.`;

/** Whether this garment is shorts (for placement: bottom RHS, not chest). */
export function isShortsGarment(garmentType?: string | null, garmentName?: string | null): boolean {
    const type = (garmentType ?? '').toLowerCase().trim();
    const name = (garmentName ?? '').toLowerCase().trim();
    return type.includes('short') || name.includes('short');
}

/** Whether this garment is a hat/cap (for placement: front panel, not side). */
export function isHatGarment(garmentType?: string | null, garmentName?: string | null, garmentCode?: string | null): boolean {
    const type = (garmentType ?? '').toLowerCase().trim();
    const name = (garmentName ?? '').toLowerCase().trim();
    const code = (garmentCode ?? '').toLowerCase().trim();
    return (
        type.includes('hat') || type.includes('cap') ||
        name.includes('hat') || name.includes('cap') || name.includes('legionnaire') ||
        name.startsWith('hw_') || code.startsWith('hw_')  // HW = headwear in many catalogs (e.g. HW_4057_Maroon)
    );
}

const PLACEMENT_CHEST =
    "Place the logo on the wearer's right chest (left side of the garment from the viewer's perspective).";
const PLACEMENT_SHORTS =
    "Place the logo on the wearer's bottom right-hand side (lower right leg/hip area of the shorts). Do NOT place at the top like a shirt — for shorts the embroidery must be in the bottom RHS section when wearing.";
const PLACEMENT_HAT =
    "Place the logo on the FRONT of the hat or cap only — the front panel (center front, above the brim). CRITICAL: Do NOT place on the side panel, the left or right side of the cap, or the neck flap. The embroidery must be on the front face of the hat, centered above the brim.";

/** Load stitch prompt from content/stitch-embroidery-directive.md (optional). */
function getStitchPrompt(options?: { garmentType?: string | null; garmentName?: string | null; garmentCode?: string | null }): string {
    let base = FALLBACK_PROMPT;
    try {
        const cwd = process.cwd();
        const candidates = [
            path.join(cwd, 'content', 'stitch-embroidery-directive.md'),
            path.join(cwd, 'ops-app', 'content', 'stitch-embroidery-directive.md'),
        ];
        for (const filePath of candidates) {
            if (!existsSync(filePath)) continue;
            const content = readFileSync(filePath, 'utf-8');
            const match = content.match(/```\s*\n([\s\S]*?)```/);
            if (match && match[1].trim().length > 0) {
                base = match[1].trim();
                break;
            }
        }
    } catch {
        // ignore
    }

    if (options && isShortsGarment(options.garmentType, options.garmentName)) {
        base = base.replace(PLACEMENT_CHEST, PLACEMENT_SHORTS);
    } else if (options && isHatGarment(options.garmentType, options.garmentName, options.garmentCode)) {
        base = base.replace(PLACEMENT_CHEST, PLACEMENT_HAT);
    }
    return base;
}

/** Check URL is reachable (Replicate must fetch it). Returns error message or null if OK. */
async function checkUrlReachable(url: string, label: string): Promise<string | null> {
    try {
        const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
        if (!res.ok) return `${label} URL returned ${res.status} (Replicate cannot fetch it)`;
        return null;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return `${label} URL not reachable: ${msg}`;
    }
}

export type StitchOptions = { garmentType?: string | null; garmentName?: string | null };

/**
 * Call Replicate Nano Banana with image URLs (API expects URLs).
 * Returns StitchResult so callers get a clear error message when the prediction fails.
 * For shorts, pass garmentType/garmentName so the prompt uses bottom-RHS placement instead of chest.
 * For hats/caps (e.g. Legionnaire), the prompt uses front-panel placement so the logo is on the front, not the side.
 */
export async function stitchGarmentWithLogoFromUrls(
    garmentImageUrl: string,
    logoUrl: string,
    options?: StitchOptions
): Promise<StitchResult> {
    ensureReplicateEnv();
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token?.trim()) {
        return { ok: false, error: 'REPLICATE_API_TOKEN not set. Add it to .env.local.' };
    }

    const garmentReach = await checkUrlReachable(garmentImageUrl, 'Garment image');
    if (garmentReach) {
        console.warn('[stitch]', garmentReach);
        return { ok: false, error: garmentReach };
    }
    const logoReach = await checkUrlReachable(logoUrl, 'Logo');
    if (logoReach) {
        console.warn('[stitch]', logoReach);
        return { ok: false, error: logoReach };
    }

    const model = (process.env.REPLICATE_STITCH_MODEL || DEFAULT_STITCH_MODEL).trim();
    try {
        console.log('[stitch] Calling Replicate', model, 'with garment + logo URLs');
        const Replicate = (await import('replicate')).default;
        const replicate = new Replicate({ auth: token });
        const prompt = getStitchPrompt(options);
        const input: Record<string, unknown> = {
            prompt,
            image_input: [garmentImageUrl, logoUrl],
            aspect_ratio: 'match_input_image',
            output_format: 'png',
        };
        if (model.includes('nano-banana-2')) {
            input.resolution = '2K';
        }
        const output = await replicate.run(model as `${string}/${string}`, {
            input,
        });
        const url = Array.isArray(output) ? output[0] : output;
        if (typeof url !== 'string') {
            return { ok: false, error: 'Replicate returned no image URL.' };
        }
        const res = await fetch(url);
        if (!res.ok) {
            return { ok: false, error: `Failed to download result image (${res.status}).` };
        }
        const buf = Buffer.from(await res.arrayBuffer());
        console.log('[stitch] Replicate succeeded');
        return { ok: true, image: buf, fromApi: true };
    } catch (e) {
        const err = e as Error & { body?: unknown; status?: number };
        let msg = err?.message ?? String(e);
        if (err?.body && typeof err.body === 'object' && 'detail' in err.body) {
            const d = (err.body as { detail?: string }).detail;
            if (typeof d === 'string') msg = d;
        }
        if (msg === 'Prediction failed' || msg.startsWith('Prediction failed:')) {
            msg = `${msg} Replicate’s nano-banana model may be overloaded or timed out. Try again in a few minutes, or check replicate.com status.`;
        }
        console.warn('[stitch]', model, 'failed:', msg);
        return { ok: false, error: msg };
    }
}

/**
 * Replicate with buffer inputs (tries data URI; often fails — prefer stitchGarmentWithLogoFromUrls).
 */
async function stitchViaReplicateNanoBanana(
    garmentBuffer: Buffer,
    logoBuffer: Buffer,
    options?: StitchOptions
): Promise<StitchResult | null> {
    ensureReplicateEnv();
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token?.trim()) return null;
    try {
        const Replicate = (await import('replicate')).default;
        const replicate = new Replicate({ auth: token });
        const garmentDataUri = `data:image/png;base64,${garmentBuffer.toString('base64')}`;
        const logoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        const prompt = getStitchPrompt(options);
        const model = (process.env.REPLICATE_STITCH_MODEL || DEFAULT_STITCH_MODEL).trim();
        const input: Record<string, unknown> = {
            prompt,
            image_input: [garmentDataUri, logoDataUri],
            aspect_ratio: 'match_input_image',
            output_format: 'png',
        };
        if (model.includes('nano-banana-2')) input.resolution = '2K';
        const output = await replicate.run(model as `${string}/${string}`, {
            input,
        });
        const url = Array.isArray(output) ? output[0] : output;
        if (typeof url !== 'string') return null;
        const res = await fetch(url);
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        return { ok: true, image: buf, fromApi: true };
    } catch (e) {
        console.warn('Nano Banana stitch failed, using passthrough:', e);
        return null;
    }
}
