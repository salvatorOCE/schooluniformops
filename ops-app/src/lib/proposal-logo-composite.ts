/**
 * Composite school logo onto page image at each region (logo_placeholder or garment).
 * Hybrid flow: garment regions use pre-stitched images (crop → stitch API → paste back).
 * Fallback: garment uses "embroidered patch" (rounded rect); logo_placeholder uses resized logo.
 */

import sharp from 'sharp';
import type { PageRegion } from './proposal-logo-vision';

export type Overlay = { input: Buffer; left: number; top: number };

/** Crop a region from the page image (for hybrid: crop garment → send to stitch API). */
export async function cropPageAtBbox(
    pageImageBuffer: Buffer,
    bbox: { x: number; y: number; width: number; height: number }
): Promise<Buffer> {
    const image = sharp(pageImageBuffer);
    const meta = await image.metadata();
    const pageWidth = meta.width ?? 1;
    const pageHeight = meta.height ?? 1;
    const left = Math.max(0, Math.round(bbox.x * pageWidth));
    const top = Math.max(0, Math.round(bbox.y * pageHeight));
    const width = Math.min(Math.round(bbox.width * pageWidth), pageWidth - left);
    const height = Math.min(Math.round(bbox.height * pageHeight), pageHeight - top);
    if (width <= 0 || height <= 0) return pageImageBuffer;
    return image.extract({ left, top, width, height }).png().toBuffer();
}

/** Composite a list of overlays onto the page (used by hybrid: stitched garment images + logo placeholders). */
export async function compositeOverlaysOntoPage(
    pageImageBuffer: Buffer,
    overlays: Overlay[]
): Promise<Buffer> {
    if (overlays.length === 0) return pageImageBuffer;
    const image = sharp(pageImageBuffer);
    return image.composite(overlays.map((o) => ({ input: o.input, left: o.left, top: o.top }))).png().toBuffer();
}

/** Dark navy patch background and border to mimic an embroidered badge */
const PATCH_FILL = '#1a2332';
const PATCH_STROKE = '#2d3a4f';
const PATCH_RADIUS = 8;
/** Logo fits inside patch with this margin (fraction of patch size) */
const LOGO_INSET = 0.12;

async function makeEmbroideredPatch(
    logoBuffer: Buffer,
    patchWidth: number,
    patchHeight: number
): Promise<Buffer> {
    const w = Math.max(1, patchWidth);
    const h = Math.max(1, patchHeight);
    const inset = Math.max(1, Math.min(Math.floor(w * LOGO_INSET), Math.floor(h * LOGO_INSET)));
    const logoW = w - 2 * inset;
    const logoH = h - 2 * inset;
    if (logoW <= 0 || logoH <= 0) {
        return sharp(logoBuffer).resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    }
    const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${w}" height="${h}" rx="${PATCH_RADIUS}" ry="${PATCH_RADIUS}" fill="${PATCH_FILL}" stroke="${PATCH_STROKE}" stroke-width="1"/>
</svg>`;
    const patchBase = await sharp(Buffer.from(svg)).png().toBuffer();
    const logoResized = await sharp(logoBuffer)
        .resize(logoW, logoH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
    const logoMeta = await sharp(logoResized).metadata();
    const lw = logoMeta.width ?? logoW;
    const lh = logoMeta.height ?? logoH;
    const logoLeft = Math.round((w - lw) / 2);
    const logoTop = Math.round((h - lh) / 2);
    return sharp(patchBase)
        .composite([{ input: logoResized, left: logoLeft, top: logoTop }])
        .png()
        .toBuffer();
}

export async function compositeLogoOntoPageImage(
    pageImageBuffer: Buffer,
    logoBuffer: Buffer,
    regions: PageRegion[]
): Promise<Buffer> {
    const image = sharp(pageImageBuffer);
    const meta = await image.metadata();
    const pageWidth = meta.width ?? 1;
    const pageHeight = meta.height ?? 1;

    const composites: { input: Buffer; left: number; top: number }[] = [];

    for (const region of regions) {
        const bbox = region.bbox;
        if (!bbox) continue;
        const left = Math.round(bbox.x * pageWidth);
        const top = Math.round(bbox.y * pageHeight);
        const width = Math.round(bbox.width * pageWidth);
        const height = Math.round(bbox.height * pageHeight);
        if (width <= 0 || height <= 0) continue;

        if (region.type === 'garment') {
            const patchBuffer = await makeEmbroideredPatch(logoBuffer, width, height);
            composites.push({ input: patchBuffer, left, top });
        } else {
            const resizedLogo = await sharp(logoBuffer)
                .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
                .png()
                .toBuffer();
            composites.push({ input: resizedLogo, left, top });
        }
    }

    if (composites.length === 0) return pageImageBuffer;
    return await image.composite(composites).png().toBuffer();
}
