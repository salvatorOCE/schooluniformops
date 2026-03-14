# Stitch / embroidery image directive

Instructions for the image model (e.g. Replicate Nano Banana) when placing a school logo onto a garment photo. The goal is **studio-quality product photography** with **realistic embroidered logo**, not a flat graphic pasted on.

---

## Prompt (for API)

Use this text as the prompt sent to the image model:

```
CRITICAL: The second input image is the complete logo. You MUST place the ENTIRE logo on the garment — both the graphic/symbol AND any text (e.g. school name, "SENIORS", year). Do NOT output only the emblem. If the logo has text underneath or beside the graphic, that text must appear in the output, embroidered in the same layout as the logo image.

Keep the frame consistent. Same image as the first input — same dimensions, same crop, same zoom. Do not change the frame. Only add the logo; do not reframe or zoom.

You are a high-end product studio photographer. Your task is to composite the school logo onto the garment so it looks like real, high-quality embroidery — not a flat graphic pasted on.

- Use the entire logo from the second input: graphic and text. If the logo has text (e.g. "VIRGINIA PRIMARY SCHOOL SENIORS 2026"), embroider that text underneath or in the same position as in the logo. Do not crop or use only the graphic part.
- Embroidered text and logo must be clean and crisp: smooth, anti-aliased edges with no jaggedness, stair-stepping, or digital artifacts. Letter edges and shape outlines should be smooth and continuous, not pixelated or rough. No detached or misaligned stitch artifacts on outlines.
- Text must have solid, dense thread coverage
- High-end embroidery look (critical): The logo and text must look like real thread embroidery, not a flat print. Show visible thread texture or stitch grain, a slight raised relief so the embroidery sits above the fabric, subtle thread sheen or highlights, and a soft shadow where the badge meets the garment. The fabric should pull or pucker slightly around the edges of the embroidery. Do not render as a flat, uniform fill — it must have depth and tactile quality like premium embroidered wear.
- Logo size (critical): The logo MUST be small — about 30% smaller than a typical left-chest patch. Aim for roughly 1–1.5 inches wide total. It should be a discreet, modest badge near the collar, not a prominent chest graphic. Do NOT make it large; smaller is better.
- Match the garment's lighting and environment. Place the logo on the wearer's right chest (left side of the garment from the viewer's perspective). Preserve the original: same background, pose, resolution, studio quality. Output one photorealistic full-garment product image.
- Frame of the garment must be the SAME as the original input 1:1.
```
-------

## Creative direction (reference)

- **Do not** simply overlay the logo as a flat layer. That produces a "plopped on" look.
- **Do** make the logo look like it was embroidered onto the garment: dense stitching, slight raise, thread sheen, and natural integration with the fabric's folds and lighting.
- **Do** keep the base image at studio quality: sharp, even lighting, clean background, no obvious digital artifacts.
- The result should be indistinguishable from a real product shot of a garment that was physically embroidered.
- **Do not** crop or zoom into the garment; keep the exact same full-product framing and scale as the input image.

## Shorts (placement override)

When the garment is **shorts** (detected by garment type or name containing "short"), the API replaces the default chest placement with: **bottom right-hand side (RHS) when wearing** — i.e. lower right leg/hip area of the shorts, not top right like a shirt. This is applied only for shorts; all other garments use the standard right-chest placement.

## Hats / caps (placement override)

When the garment is a **hat or cap** (detected by garment type or name containing "hat", "cap", or "legionnaire"), the API replaces the default chest placement with: **front panel (center front, above the brim)**. The logo must be embroidered on the front face of the hat, not on the side panel. This avoids the AI placing the logo on the side of Legionnaire or baseball-style caps.
