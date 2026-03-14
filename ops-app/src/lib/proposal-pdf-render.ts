/**
 * Render a PDF to one PNG image per page using pdf2pic (GraphicsMagick + Ghostscript).
 * Avoids pdfjs + node-canvas "Image or Canvas expected" when PDFs contain embedded images.
 * Requires: pdf2pic, and system deps: GraphicsMagick and Ghostscript (e.g. brew install graphicsmagick ghostscript).
 */

import { fromBuffer } from "pdf2pic";

export interface RenderPdfResult {
    pageImages: Buffer[];
    pageCount: number;
}

export async function renderPdfToPageImages(pdfBuffer: Buffer): Promise<RenderPdfResult> {
    try {
        const convert = fromBuffer(pdfBuffer, {
            format: "png",
            density: 144,
            width: 1024,
            height: 1024,
            preserveAspectRatio: true,
        });
        const results = await convert.bulk(-1, { responseType: "buffer" });
        const pageImages: Buffer[] = results.map((r: { buffer?: Buffer }) => {
            if (r?.buffer) return Buffer.isBuffer(r.buffer) ? r.buffer : Buffer.from(r.buffer as ArrayBuffer);
            throw new Error("pdf2pic returned result without buffer");
        });
        return { pageImages, pageCount: pageImages.length };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (
            msg.includes("gm") ||
            msg.includes("GraphicsMagick") ||
            msg.includes("ghostscript") ||
            msg.includes("ENOENT") ||
            msg.includes("spawn")
        ) {
            throw new Error(
                "PDF rendering requires GraphicsMagick and Ghostscript. On macOS run: brew install graphicsmagick ghostscript"
            );
        }
        throw e;
    }
}
