# Asset ledger and requirements

Updated through Phase 04, 2026-11-17. Phase 02/03 photographs below remain third-party editorial references, not shop inventory/workshop/certification evidence. Phase 04 adds eleven original AI-generated catalogue concept images, separately labelled and recorded below. Final brand/client/legal clearance remains pending. This file owns provenance; DESIGN owns presentation, PROJECT_STATE owns actual test/performance evidence.

## Included photographs

The source pages explicitly list the free Unsplash License. License checked on 2026-11-17: [Unsplash License](https://unsplash.com/license). The license allows downloading and commercial/non-commercial use; the files are not being resold or used to build a competing image service. Photographer attribution is retained in the footer and study dialogs. No photographer/shop affiliation is implied.

| Local file | Photographer / source page | Verified dimensions / bytes | Treatment and use |
|---|---|---|---|
| `public/images/editorial/bridal-set.webp` | AI-generated (Figma AI, 2026-11-26) | 1536×1024 | Bridal category card, design-preview hero and bridal study; labelled AI-generated, not shop stock |
| `public/images/editorial/rani-haar.webp` | AI-generated (Figma AI, 2026-11-26) | 1536×1024 | Necklaces category card and necklace study |
| `public/images/editorial/jhumkas.webp` | AI-generated (Figma AI, 2026-11-26) | 1024×1024 | Earrings category card, homepage finale and earring study |

All three downloaded successfully and were visually inspected. Runtime uses local assets via Next Image with responsive sizes and AVIF/WebP negotiation; no remote-image host is needed. Hero is prioritized; later photographs are lazy-loaded. CSS crops preserve originals; full images are available in study dialogs. No local image manipulation or invented compositing was performed.

Provenance labels differ from the eventual seeded catalogue's data-origin model: these are third-party licensed reference photographs, with no catalogue or physical-stock record. Do not automatically seed them as actual items.

## Fonts and original vector work

Cormorant Garamond (editorial) and Manrope (interface) load through `next/font/google`, with generated build-time self-hosting. Both exact family notices were checked on 2026-11-17: [Cormorant Garamond OFL](https://github.com/google/fonts/blob/main/ofl/cormorantgaramond/OFL.txt), [Manrope OFL](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt). Copyright notices and the common SIL OFL 1.1 license are included at `public/licenses/fonts.txt` and served at `/licenses/fonts.txt`. No copied proprietary font binaries are committed. [Next font delivery](https://nextjs.org/docs/app/api-reference/components/font) documents the build-time download. Urdu typography/glyph coverage is still an implementation/evaluation requirement for later language work.

The simple R/diamond favicon and line icons are original code-native SVG shapes, not copied brand marks. The provisional textual wordmark is not the owner's approved logo. Cartier/Tiffany are directional references only; no logo, campaign image, layout or protected branded asset was copied from them.

## Required before the final cinematic homepage

| Asset | Required specification / decision | Status |
|---|---|---|
| Brand identity | Confirm spelling, approved vector wordmark/monogram, clear space and color variants | Owner decision pending |
| Hero piece | Approved high-resolution piece/portrait crops with desktop and 390px/320px safe areas; rights and inventory truth documented | Reference treatment exists; final owner piece absent |
| Craft editorial | Authentic permitted macro/atelier photography and verified craft/history copy | Absent; do not imply reference photos show owner's workshop |
| Collections | Distinct approved occasions/everyday/bridal compositions, mobile crops and meaningful alt text | Two reference moods only; final collection identity/content pending |
| Rotation sequence | Optional licensed multi-angle sequence with consistent lighting/registration, responsive derivatives, poster and measured byte budget | Absent; no fake 3D or synthetic manufacturing claims |
| Genuine 3D | Optional optimized GLB/glTF, original/rightsholder permission, materials, compression and still poster; demonstrate fidelity/performance first | Absent; no Three.js dependency added |
| AURIA transformation | Permitted reference and an actual generated concept with provenance/version/caption | Absent; current interface is a visual concept only |
| Shop/catalogue assets | Authentic product angles, option definitions, verified specifications/availability and public-use permission | Absent; three visual studies do not satisfy the 60–100-design catalogue target |

Phase 03 can use the documented photographic route only with honest reference captions and approval of that treatment; real shop claims need owner assets. Preserve the existing originals, source links and attribution when adding derivatives. Record any new asset's owner/license, source/date, dimensions, intended crop, alt text and real/sample/concept classification before publishing it.

## Phase 03 reuse and remaining limitations

The user authorized the provisional homepage using existing permitted references, not final brand/campaign or image-license approval. No additional raster photograph, AI output, genuine3D asset or rendered sequence was acquired in this phase. The Phase 02 source/license notes above remain the existing ledger; Phase 03 does not assert a new legal clearance or photographer/shop affiliation.

Necklace photograph: entrance, burgundy bridal mood, bridal category and AURIA visual metaphor. Pendant: craft close-up and necklace category. Round-stud earrings: earring category and final editorial invitation. No photograph establishes actual bridal inventory, metal/purity, workshop techniques or manufacturability. Crops/transforms are browser presentation; source JPEGs remain unchanged.

`src/components/home/jewellery-drawing.tsx` contains original code-native ring/bangle/signet/necklace line studies. Category cards explicitly identify illustration where no appropriate photograph exists. The AURIA sketch/reference wipe is hand-authored2D presentation, not an actual generated concept. True category/client photography and a permitted actual concept pair are still missing; replace these studies only when provenance and scope are approved. All photographic rights status remains as recorded above, not final client sign-off.

## Phase 04 original synthetic catalogue assets

Built-in image_gen was used through the imagegen skill, with one separately specified original asset per design. No reference product/brand photograph or scraped source was supplied. Original source images are1254×1254 PNGs, retained in the tool's generated-images folder; the application references only local WebP derivatives under public/images/catalogue. Each design has distinct subject geometry, not duplicate crops masquerading as new designs. Prompts, generated filenames, source checksums, derivative dimensions/bytes/checksums and AI_GENERATED origin are permanently recorded in src/data/demo/catalogue-assets.json.

| ID / local basename | Concept subject |
|---|---|
| design-001 | Mehr Crescent Collar — floral bridal crescent with ivory-toned drops |
| design-002 | Gulzar Medallion Haar — long three-medallion necklace |
| design-003 | Noor Lattice Choker — open diamond-lattice choker |
| design-004 | Aabshar Layered Necklace — three beaded chains and fan motifs |
| design-005 | Petal Seal Ring — five sculpted petals |
| design-006 | Dune Fold Ring — broad concave folded ribbon |
| design-007 | Jali Arch Ring — openwork geometric arch |
| design-008 | Oval Quiet Signet — unmarked oval face and beaded border |
| design-009 | Leaf Embrace Ring — two veined wrap leaves |
| design-010 | Tidal Cuff — broad undulating open cuff |
| design-011 | Lotus Rhythm Kada — repeated raised lotus motifs |

Every basename has960×960 .webp and480×480 -480.webp derivatives (22 files, total1,778,670 bytes on disk). scripts/prepare-catalogue-assets.mjs uses the installed Next Sharp dependency to resize/encode only; no visual redesign, category duplication or credentialed API generation. Existing outputs are not overwritten. Browser picture/Next Image uses responsive static derivatives, reserved aspect ratios, lazy offscreen loading and a designed error fallback. No runtime image-transform request is needed for these catalogue images.

The first11 outputs were visually inspected. A subsequent five-asset batch and one single built-in retry failed with connection errors; no successful later output is referenced. The skill required explicit approval before a credentialed CLI fallback. The user selected **Finish with available imagery**. Therefore14 remaining authored briefs stay DRAFT; only11 designs are public. Necklaces, Earrings and Men's Jewellery currently have no image-backed catalogue samples, with honest empty states. Existing reference photographs were not silently converted into stock products, and no CLI/API key was used.

This is original synthetic imagery for a demo, not final legal/client/brand clearance, actual jewellery photography, verified gold/stone purity, physical stock, CAD or manufacturability evidence. Cards, alt text and previews retain AI concept/sample labels. Replacing these with actual shop products requires owner-approved rights/specification/stock data. AURIA is still unconnected; generating local design assets did not implement its image feature.

## Phase 04 homepage delivery derivatives

The same permitted floral-necklace.jpg remains unchanged. Added public/images/editorial/derivatives/home-hero-{768,1280,1920}.webp at26,610 /52,574 /90,262 bytes. The responsive picture selects768px on mobile,1280px normally and1920px at wide desktops, with eager/high-priority static delivery. This bypasses the measured runtime image-transformation path for the LCP photo, not a new crop, source, 3D asset or brand approval. ASSETS records bytes/provenance; PROJECT_STATE and ignored performance JSON record measured before/after timing and limitations.

2026-11-26: the three Unsplash editorial photographs and the unused `editorial/derivatives/home-hero-*` files were replaced by AI-generated images in the charcoal and gold palette. See it on uses `public/images/models/rsj-woman.webp` and `rsj-man.webp` (AI-generated, Figma AI).
