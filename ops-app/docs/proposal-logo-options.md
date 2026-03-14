# Ways to Get “Embroidered Logo on Garment” in Proposal PDFs

The current pipeline (vision bbox + Sharp composite) is fragile: vision can return wrong regions, and a programmatic “patch” doesn’t look like real embroidery. Here are alternative approaches that match what you want (logo stitched on RHS, pro quality).

---

## Option 1: Hybrid – Crop garment → AI stitch → Paste back (recommended)

**Idea:** Do the “stitch” step the same way you did with Nano Banana: one garment image + logo, instruction “stitch logo on RHS, pro quality.” We only handle PDF ↔ images and layout.

**Flow:**

1. **Render PDF** → one image per page (existing).
2. **Vision** → for each page, get bboxes for *whole garment photos* only (not chest patch; we need the full product image). So: “Return bbox of each garment product image (polo, jumper) on this page.”
3. **Crop** → from each page image, extract the image at that bbox (the garment photo only).
4. **External “stitch” API** → for each crop: send garment image + school logo to Nano Banana (or Replicate/Fal) with prompt like: “Keep this garment image exactly the same. Stitch this logo on the wearer’s right chest (RHS). Pro / Image Pro Studio quality.” Get back a single image per garment.
5. **Paste back** → composite the returned image(s) back onto the page image at the same bbox (replacing the original garment). No “patch” drawing; the AI output already has the logo on the garment.
6. **Rebuild PDF** → from the modified page images (existing).

**Pros:** Reuses the workflow that already worked for you (AI does the stitch). We only do cropping and layout.  
**Cons:** Need API access (Nano Banana, Replicate, Fal, etc.) and per-garment calls (cost/latency).  
**Fits:** “I gave garment + logo to Nano Banana and said stitch on RHS, pro quality.”

---

## Option 2: Full-page AI edit (one call per page)

**Idea:** Don’t do bbox/composite ourselves. Send the *whole page image* + logo to an AI that can follow: “Place this logo embroidered on the RHS of each garment in this catalog page. Do not cover text.”

**Flow:**

1. Render PDF → one image per page.
2. For each page image: call an image-editing API (e.g. instruction-based edit, or inpainting with a mask) with the page image, logo, and the instruction above.
3. Rebuild PDF from the returned images.

**Pros:** No bbox logic, no composite logic; AI handles placement and style.  
**Cons:** Depends on model understanding “each garment” and “don’t cover text”; may be less predictable than Option 1. Need a suitable API.

---

## Option 3: Fix current pipeline (vision + composite)

**Idea:** Keep vision + Sharp composite but harden it: better prompts, stricter bboxes, smaller “patch” so we never cover text.

- Vision: only return bboxes that are clearly *inside* a garment product image, and only for a small chest area (e.g. max 20% of page width). Reject any bbox that overlaps text (e.g. by asking the model to avoid text, or by discarding large bboxes).
- Composite: only draw the patch in that small bbox; never use “logo_placeholder” for decorative overlays on text.

**Pros:** No new APIs; everything in-app.  
**Cons:** Still a flat “patch” look, not true embroidery; placement and vision mistakes can still happen.

---

## Option 4: Don’t modify the PDF; attach “stitched” assets

**Idea:** Keep the proposal PDF as-is. Separately, generate “stitched” garment images (e.g. via Nano Banana: garment crop + logo, “stitch on RHS”) and attach them to the proposal (e.g. extra download, or an “Assets” section with one image per garment).

**Pros:** Simple; reuses your existing stitch workflow; no PDF layout logic.  
**Cons:** Logo isn’t inside the PDF; client sees PDF + separate images.

---

## Recommendation

- **Best match for “like I did with Nano Banana”:** **Option 1 (Hybrid).** We add a step: “for each garment crop, call external stitch API (Nano Banana or compatible) with garment + logo and your instruction; paste result back and rebuild PDF.”
- **If you want to try with no new API first:** Harden **Option 3** (stricter vision, smaller bbox, no overlay on text), accepting that the look will still be “patch” not true embroidery.
- **If you have an API that can do full-page edits:** **Option 2** is worth a test with a clear, short instruction and one page.

---

## Next steps for Option 1 (hybrid)

1. **Vision change:** Add a region type or a separate prompt that returns bboxes for *whole garment product images* (full polo, full jumper), not “chest patch.” We use these only for crop → API → paste.
2. **Stitch provider:** Choose one:
   - **Nano Banana API** (e.g. nanobananaapi.ai) if you have access.
   - **Replicate / Fal** with a model that does instruction-based image editing (e.g. “add logo to right chest of shirt”).
3. **New module:** e.g. `proposal-garment-stitch.ts`: input = garment image buffer + logo buffer; call provider with your prompt; return stitched image buffer.
4. **Generate route:** After vision, for each “garment” bbox: crop page → call stitch module → composite result back at same bbox → then rebuild PDF as now.

If you tell me which provider you want (Nano Banana vs Replicate vs Fal vs “just document it for now”), I can outline the exact API calls and where to plug them into the code.
