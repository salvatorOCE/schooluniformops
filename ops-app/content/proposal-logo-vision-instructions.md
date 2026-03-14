---
name: proposal-logo-vision
description: "Classify images from a school uniform proposal PDF as logo placeholder or garment; for garments, return normalized bounding box for logo placement."
---

# Proposal logo vision — classify and locate

## Overview

You are classifying images extracted from a school uniform proposal PDF. For each image you must decide: (1) **logo placeholder** — a generic or blank logo/box that should be replaced entirely by the school logo; or (2) **garment photo** — a photo of clothing (e.g. shirt, polo, jumper) where the school logo should be composited as if embroidered, and you must return a normalized bounding box for where to place the logo (e.g. chest area).

## When to use

- You receive one or more images that came from a proposal PDF.
- Each image is from a template that may contain placeholder logo graphics and/or photos of garments.
- Your output drives an automated pipeline: logo placeholders get replaced by the school logo; garment photos get the school logo composited onto them at the box you specify.

## Input

- **Image(s)**: One or more images (PNG/JPEG) extracted from the proposal PDF. They may be:
  - A logo placeholder: blank box, "logo here" graphic, generic icon, or similar.
  - A garment photo: photograph of a uniform item (polo, shirt, blazer, etc.) with no logo or with a generic placeholder on the garment.
- **Reference (optional)**: If provided, a canonical "logo placeholder" reference image. Any image that looks like this reference should be classified as `logo_placeholder`. The repo includes a default at `public/placeholder-logo.png` for use in templates and (optionally) for image-matching or as the reference image sent to the model.

## Output

Respond with **valid JSON only**, no markdown or extra text. Use exactly one of these shapes per image.

**Logo placeholder** (replace entire area with school logo). You MUST include a bbox for the placeholder area:

```json
{"type": "logo_placeholder", "bbox": {"x": 0.1, "y": 0.05, "width": 0.35, "height": 0.2}}
```

**Garment photo** (the full product image of one clothing item — polo, jumper, etc.). Return the bbox of the **entire** garment image (the whole photo), not just the chest. Normalized 0–1:

```json
{"type": "garment", "bbox": {"x": 0.05, "y": 0.2, "width": 0.3, "height": 0.35}}
```

- `x`, `y`: top-left of the garment image. `width`, `height`: full width and height of that product photo (e.g. 0.25–0.4 width, 0.2–0.35 height). One garment region per product image on the page.

When returning multiple images, return a JSON array, one object per image in the same order as the input images:

```json
[
  {"type": "logo_placeholder"},
  {"type": "garment", "bbox": {"x": 0.35, "y": 0.2, "width": 0.25, "height": 0.18}}
]
```

## Examples

**Single image — logo placeholder:**

Input: image of a grey box with "Logo here" text.  
Output: `{"type": "logo_placeholder"}`

**Single image — garment:**

Input: photo of a navy polo shirt (front-facing).  
Output: `{"type": "garment", "bbox": {"x": 0.12, "y": 0.2, "width": 0.22, "height": 0.16}}` (bbox on wearer's right chest = viewer's left)

**Two images:**

Input: image 1 = logo placeholder graphic; image 2 = polo shirt photo.  
Output: `[{"type": "logo_placeholder"}, {"type": "garment", "bbox": {"x": 0.35, "y": 0.2, "width": 0.25, "height": 0.15}}]`

## Rules

- **Do NOT place the logo over product text.** Any graphic, shape, or "placeholder" that overlaps or covers product titles, FABRIC descriptions, or STYLE FEATURES text must NOT be returned as logo_placeholder. Skip it (do not return it).
- **logo_placeholder**: Only use for a dedicated, isolated logo box that does not overlap body text. If the only logo-like graphic is over the text, return [] for that element.
- **garment**: Only for the actual product PHOTO (the clothing image — polo, shirt, jumper). The bbox must fall entirely within that garment image, on the wearer's right chest (viewer's left). If the page has multiple garment photos, return one garment region per photo.
- If an optional reference placeholder image is provided and the image looks like it and does not overlay text, classify as `logo_placeholder`.
- If unsure, prefer returning fewer regions to avoid covering text. Always return valid JSON.

## Limitations

- One bbox per garment (chest area only). Multiple garments on one page = multiple garment entries in the array.
- Do not return regions for decorative graphics that sit on top of product text — that would place the logo over the text and must be avoided.
- If the image is neither a clear isolated logo box nor a garment photo (e.g. decorative only), do not return it; omit or return [].
