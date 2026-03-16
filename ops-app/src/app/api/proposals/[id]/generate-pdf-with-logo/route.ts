import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { Proposal, ProposalStatus } from '@/lib/types';
import { getRegionsForPageImage } from '@/lib/proposal-logo-vision';
import {
    cropPageAtBbox,
    compositeOverlaysOntoPage,
} from '@/lib/proposal-logo-composite';
import { stitchGarmentWithLogo, stitchGarmentWithLogoFromUrls } from '@/lib/proposal-garment-stitch';
import { buildPdfFromPageImages } from '@/lib/proposal-pdf-rebuild';
import { readFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import type { PageRegion } from '@/lib/proposal-logo-vision';
import type { Overlay } from '@/lib/proposal-logo-composite';

const TABLE = 'proposals';
const PROPOSAL_PDF_BUCKET = 'proposal-pdfs';

export const maxDuration = 60;

type HybridOptions = {
    logoUrl?: string;
    uploadTemp?: (buffer: Buffer, name: string) => Promise<string>;
};

/** Hybrid flow: crop each garment → stitch API (with URLs when available) → paste back; logo_placeholder gets resized logo. */
async function processPageWithHybrid(
    pageImageBuffer: Buffer,
    logoBuffer: Buffer,
    regions: PageRegion[],
    options?: HybridOptions
): Promise<{ buffer: Buffer; stitchApiUsed: boolean }> {
    const meta = await sharp(pageImageBuffer).metadata();
    const pageWidth = meta.width ?? 1;
    const pageHeight = meta.height ?? 1;
    const overlays: Overlay[] = [];
    let stitchApiUsed = false;
    const useReplicateUrls = !!(
        process.env.REPLICATE_API_TOKEN &&
        options?.logoUrl &&
        options?.uploadTemp
    );

    for (let ri = 0; ri < regions.length; ri++) {
        const region = regions[ri];
        const bbox = region.bbox;
        if (!bbox) continue;
        const left = Math.round(bbox.x * pageWidth);
        const top = Math.round(bbox.y * pageHeight);
        const width = Math.round(bbox.width * pageWidth);
        const height = Math.round(bbox.height * pageHeight);
        if (width <= 0 || height <= 0) continue;

        if (region.type === 'garment') {
            const crop = await cropPageAtBbox(pageImageBuffer, bbox);
            let stitchResult: Awaited<ReturnType<typeof stitchGarmentWithLogo>> | null = null;
            if (useReplicateUrls && options.uploadTemp && options.logoUrl) {
                const garmentUrl = await options.uploadTemp(crop, `garment-${ri}`);
                stitchResult = await stitchGarmentWithLogoFromUrls(garmentUrl, options.logoUrl);
            }
            if (!stitchResult?.ok) stitchResult = await stitchGarmentWithLogo(crop, logoBuffer);
            if (stitchResult?.ok) {
                if (stitchResult.fromApi) stitchApiUsed = true;
                const resized = await sharp(stitchResult.image)
                    .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
                    .png()
                    .toBuffer();
                const resizedMeta = await sharp(resized).metadata();
                const rw = resizedMeta.width ?? width;
                const rh = resizedMeta.height ?? height;
                const overlayLeft = left + Math.round((width - rw) / 2);
                const overlayTop = top + Math.round((height - rh) / 2);
                overlays.push({ input: resized, left: overlayLeft, top: overlayTop });
            }
        } else {
            const resizedLogo = await sharp(logoBuffer)
                .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
                .png()
                .toBuffer();
            overlays.push({ input: resizedLogo, left, top });
        }
    }

    const buffer = await compositeOverlaysOntoPage(pageImageBuffer, overlays);
    return { buffer, stitchApiUsed };
}

function mapRow(row: Record<string, unknown>): Proposal {
    return {
        id: String(row.id),
        school_id: row.school_id != null ? String(row.school_id) : null,
        school_name: String(row.school_name ?? ''),
        school_code: String(row.school_code ?? ''),
        title: String(row.title ?? ''),
        status: (row.status as ProposalStatus) || 'draft',
        pdf_url: row.pdf_url != null ? String(row.pdf_url) : null,
        logo_url: row.logo_url != null ? String(row.logo_url) : null,
        template_snapshot: (row.template_snapshot as Record<string, unknown>) ?? {},
        template_id: row.template_id != null ? String(row.template_id) : null,
        created_at: String(row.created_at),
        updated_at: String(row.updated_at),
        sent_at: row.sent_at != null ? String(row.sent_at) : null,
        reply_text: row.reply_text != null ? String(row.reply_text) : null,
        reply_at: row.reply_at != null ? String(row.reply_at) : null,
    };
}

/** POST /api/proposals/[id]/generate-pdf-with-logo */
export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const admin = supabaseAdmin;
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Proposal ID required' }, { status: 400 });
    }

    try {
        const { data: proposalRow, error: fetchErr } = await admin
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .single();
        if (fetchErr || !proposalRow) {
            return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
        }
        const proposal = mapRow(proposalRow as Record<string, unknown>);
        if (!proposal.logo_url) {
            return NextResponse.json(
                { error: 'Upload a school logo first (proposal.logo_url is required)' },
                { status: 400 }
            );
        }
        // Use template PDF as source so we never stack generations (always start from clean template)
        let sourcePdfUrl: string | null = null;
        if (proposal.template_id) {
            const { data: templateRow } = await admin
                .from('proposal_templates')
                .select('pdf_url')
                .eq('id', proposal.template_id)
                .single();
            sourcePdfUrl = (templateRow as { pdf_url?: string } | null)?.pdf_url ?? null;
        }
        if (!sourcePdfUrl) sourcePdfUrl = proposal.pdf_url;
        if (!sourcePdfUrl) {
            return NextResponse.json(
                { error: 'Proposal has no PDF and no template PDF to use' },
                { status: 400 }
            );
        }

        const [pdfRes, logoRes] = await Promise.all([
            fetch(sourcePdfUrl),
            fetch(proposal.logo_url),
        ]);
        if (!pdfRes.ok) {
            return NextResponse.json({ error: 'Failed to fetch source PDF (template)' }, { status: 502 });
        }
        if (!logoRes.ok) {
            return NextResponse.json({ error: 'Failed to fetch school logo' }, { status: 502 });
        }
        const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
        const logoBuffer = Buffer.from(await logoRes.arrayBuffer());

        let pageImages: Buffer[];
        try {
            const { renderPdfToPageImages } = await import('@/lib/proposal-pdf-render');
            const result = await renderPdfToPageImages(pdfBuffer);
            pageImages = result.pageImages;
        } catch (renderErr) {
            const msg = renderErr instanceof Error ? renderErr.message : String(renderErr);
            if (msg.includes('GraphicsMagick') || msg.includes('Ghostscript') || msg.includes('brew install')) {
                return NextResponse.json(
                    { error: msg },
                    { status: 501 }
                );
            }
            throw renderErr;
        }

        const instructionPath = path.join(process.cwd(), 'content', 'proposal-logo-vision-instructions.md');
        let systemPrompt: string;
        try {
            systemPrompt = await readFile(instructionPath, 'utf-8');
        } catch {
            systemPrompt = 'You classify regions in proposal PDF pages as logo_placeholder or garment and return a JSON array of { type, bbox } with normalized 0-1 coordinates.';
        }

        const processedPages: Buffer[] = [];
        let stitchApiUsed = false;
        const debug: {
            sourcePdf: string;
            replicateTokenSet: boolean;
            pages: { pageIndex: number; regions: string[]; overlayCount: number }[];
        } = {
            sourcePdf: sourcePdfUrl === proposal.pdf_url ? 'proposal' : 'template',
            replicateTokenSet: !!(process.env.REPLICATE_API_TOKEN?.trim()),
            pages: [],
        };
        const uploadTemp = async (buf: Buffer, name: string) => {
            const path = `temp/${id}/${Date.now()}-${name}.png`;
            await admin.storage
                .from(PROPOSAL_PDF_BUCKET)
                .upload(path, buf, { contentType: 'image/png', upsert: true });
            const { data } = admin.storage.from(PROPOSAL_PDF_BUCKET).getPublicUrl(path);
            return data.publicUrl;
        };
        const hybridOptions: HybridOptions = {
            logoUrl: proposal.logo_url ?? undefined,
            uploadTemp,
        };
        for (let i = 0; i < pageImages.length; i++) {
            const regions = await getRegionsForPageImage(pageImages[i], systemPrompt);
            const regionsWithBbox = regions.filter((r) => r.bbox);
            debug.pages.push({
                pageIndex: i,
                regions: regionsWithBbox.map((r) => `${r.type}${r.bbox ? '' : '(no bbox)'}`),
                overlayCount: 0,
            });
            const { buffer, stitchApiUsed: pageUsed } = await processPageWithHybrid(
                pageImages[i],
                logoBuffer,
                regions,
                hybridOptions
            );
            debug.pages[i]!.overlayCount = regionsWithBbox.length;
            if (pageUsed) stitchApiUsed = true;
            processedPages.push(buffer);
        }
        console.log('[generate-pdf-with-logo]', JSON.stringify(debug, null, 2));

        const newPdfBuffer = await buildPdfFromPageImages(processedPages);
        // Versioned path so each generation gets a new URL (no cache, and keeps history in storage)
        const version = Date.now();
        const uploadPath = `${id}/${version}.pdf`;
        const { error: uploadError } = await admin.storage
            .from(PROPOSAL_PDF_BUCKET)
            .upload(uploadPath, newPdfBuffer, { upsert: true, contentType: 'application/pdf' });
        if (uploadError) {
            console.error('Generate PDF upload error:', uploadError);
            return NextResponse.json({ error: uploadError.message || 'Upload failed' }, { status: 500 });
        }
        const { data: urlData } = admin.storage.from(PROPOSAL_PDF_BUCKET).getPublicUrl(uploadPath);
        const { data: updated, error: updateErr } = await admin
            .from(TABLE)
            .update({ pdf_url: urlData.publicUrl, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (updateErr) {
            return NextResponse.json({ error: updateErr.message || 'Update failed' }, { status: 500 });
        }
        const body = mapRow(updated as Record<string, unknown>);
        return NextResponse.json({
            ...body,
            _generation: { mode: 'hybrid', stitchApiUsed, debug },
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Generate PDF with logo failed' },
            { status: 500 }
        );
    }
}
