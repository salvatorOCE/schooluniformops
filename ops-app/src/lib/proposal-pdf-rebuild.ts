/**
 * Rebuild a PDF from page image buffers (one image per page).
 */

import { PDFDocument } from 'pdf-lib';

export async function buildPdfFromPageImages(pageImageBuffers: Buffer[]): Promise<Buffer> {
    const doc = await PDFDocument.create();
    for (const buf of pageImageBuffers) {
        const img = await doc.embedPng(buf);
        const page = doc.addPage([img.width, img.height]);
        page.drawImage(img, {
            x: 0,
            y: 0,
            width: img.width,
            height: img.height,
        });
    }
    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
}
