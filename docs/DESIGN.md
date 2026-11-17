# Royal Gold Atelier — design direction and cinematic storyboard

Status: Phase 03 implementation, 2026-11-17; provisional Royal Gold Atelier direction. The user's latest six-scene assignment supersedes the earlier Phase 01 ordering; the canonical table below now matches that assignment. Phase 02 tokens/preview remain intact. Final brand/client photography approval remains pending; reference reuse does not establish final campaign rights. [UX.md](UX.md) owns navigation/behavior; [ACCEPTANCE.md](ACCEPTANCE.md) owns checks; PROJECT_STATE records actual test outcomes. This is a Codex internal design review, not independent approval.

## 1. Art direction

Use an editorial jewellery atelier with Pakistani craft references: a quiet obsidian opening, generous ivory catalogue pages, antique gold accents and restrained burgundy for bridal storytelling. One decisive piece dominates each hero crop. Warm directional lighting, metal texture and real craft detail carry the luxury; decoration supports the product rather than competing with it.

Avoid invented heritage dates, certification seals, testimonials, stock scarcity or claimed handcraft techniques. Sample lifestyle imagery must not masquerade as the owner's showroom or actual products. AI concepts always retain their concept caption. Request original/approved photography, front/angle/detail crops, permission/provenance, mobile-safe compositions and optional craft footage before final art direction. No brand image generation is required in this phase.

## 2. Design tokens and layout

| Token / role | Proposed value / treatment |
|---|---|
| Obsidian / dark surfaces | `#101011`; warm ivory primary text |
| Antique gold / ornament and large accents | `#C5A15B`; do not assume suitable small-text contrast on ivory |
| Champagne / soft highlights | `#E8D5A6`; dark text, never faint body text on ivory |
| Ivory / catalogue surface | `#F6F1E8`; obsidian body text |
| Burgundy / bridal accent | `#5B202D`; ivory text after contrast verification |
| Editorial serif | Cormorant Garamond 400/500/600, normal/italic; display and editorial titles |
| Interface sans | Manrope variable; body, forms, prices and captions; Urdu coverage remains unverified |
| Space scale | 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px; logical properties where practical |
| Content grid | Desktop 12 columns, 24–32px gutters, ~1280px reading envelope; mobile 4 columns, 16–20px gutters |
| Corners / elevation | Mostly square; 2px/6px tokens; subtle borders and dialog elevation; no pill-shaped catalogue everywhere |
| Type scale | Body 16px base; readable supporting copy 14–16px; metadata/eyebrows 9–12px with AA contrast, not essential instructions; hero fluid ~56–112px desktop / 52–88px mobile; verify real-device readability |
| Interaction motion | 180/260ms controls; 650ms editorial reveal; user preference overrides |

The canonical installed values are in `src/styles/tokens.css`, consumed by Tailwind v4 and CSS. Antique gold is decorative/on dark; a separate `#755628` gold-ink token is used for small text on ivory. Light/dark semantic surfaces include explicit text, muted, line and focus roles. Fonts use Next's build-time Google Fonts delivery and local serving; see [ASSETS.md](ASSETS.md). Keep body text ~60–75 characters per line. Urdu glyph coverage and real-device readability remain unverified.

## 3. Component language and page treatments

Header moves from transparent-on-hero to opaque after its readable threshold; text contrast is assured in both states. Search is an accessible dialog on desktop and focused full-height panel on mobile. Collection cards vary in editorial size but use one ratio per section to prevent visual noise.

Product cards: restrained image frame (4:5 candidate), source label, title, category/purity only when known, separate fulfilment badge, wishlist toggle and one clear destination. No crossed-out fabricated prices. Product detail uses an asymmetric gallery and calm specification panel; mobile moves specification and CTA below a swipeable gallery with explicit controls.

Quote forms use a guided three-step layout (design/options, contact, review) with a visible step title and return path. Use a single-column reading order even when desktop summary sits beside the form. AURIA uses a calm conversational panel with legible cards, distinct attachment versus generated-concept frames and a persistent mic status; waveform decoration never substitutes for actual connection state.

Gold pages use editorial clarity: source, observed time and mode adjacent to the rate; tabular numerals; inputs grouped with units; result exclusions close to the number. No casino-like ticking rate effects. Policy/FAQ/story pages use narrow reading columns and the same typography, not an unrelated template.

## 4. Homepage cinematic sequence

Scroll ranges below are design budgets relative to viewport height (vh), not time guarantees. Natural document flow remains the base. Pin only on screens >=1024px wide and >=700px tall when motion is allowed and media is ready; otherwise use the mobile/static composition. Total additional pinned travel target <=180vh. No scroll hijacking, forced intro wait, autoplay sound or mandatory video download.

| Scene | Composition and narrative | Desktop motion / scroll budget | Touch, reduced-motion and failed-media fallback | Destination |
|---|---|---|---|---|
| S-01 Royal entrance | Full-viewport obsidian jewellery composition; “Beyond the moment”; two real chapter anchors and scroll cue | <=12px/600ms entrance groups; 1.03 scrub scale, 2% vertical drift; CSS perspective light-plane, no pin | Separate top-copy/bottom-photo composition; static photo and natural anchors; designed text fallback if missing | `/#vault`, `/#auria`, `/#craft` |
| S-02 The art of craftsmanship | Ivory editorial close-up, neutral detail copy and line/caption layers; same photographic visual family | Pinned frame adds80vh; 1.03 scale/-4% media drift and growing fine line | Copy and photograph stacked; no pin/parallax; no claim of shop manufacturing techniques | `/#bridal` |
| S-03 Bridal heritage | Full-height burgundy chapter, arch-framed photographic reference and large serif story | Normal flow; restrained +/-2% parallax /1.03 scale; text reveal | Burgundy-specific mobile crop/stack; static when reduced | `/#vault` (not an unbuilt bridal route) |
| S-04 The Design Vault | Six category directions: Bridal, Rings, Bangles, Necklaces, Earrings, Men's Jewellery; three photos and three original vector studies, explicitly not inventory | Positive measured overflow drives linear horizontal track; pin adds100vh; previous/next and focused-card visibility supported | Native touch horizontal gallery; reduced motion shows all six in a flowing grid/stack with no forced translation | Local category explanation; permitted photo-study links to existing `/design-preview` anchors |
| S-05 AURIA atelier | Original necklace line illustration/reused photograph transition, editorial interface preview and explicit unconnected-service caption | Normal flow; masked photographic reveal, never a claimed generated output; no API call | Static split illustration/photo, then legible copy/interface; same explanation dialog | “Design with AURIA” opens truthful availability explanation; `/ai-atelier` remains unbuilt |
| S-06 Gold, value & final experience | Clearly arbitrary illustrative24K/gram figure, intimate final composition and appointment/enquiry invitations | Normal flow; optional text reveal; static photographic perspective, natural footer | Stacked board, large final type and accessible feature-explanation CTAs | Local availability explanations; no booking/form/rate integration |

Scene copy remains provisional. The AURIA text in quotation marks is an explicitly labelled illustrative prompt, not a testimonial. S-05 is a hand-authored illustration-to-reference visual metaphor, NOT a before/after AI result; an actual generated concept needs later provenance and workshop limitations. No placeholder image URLs, fabricated transformations, paid generation, mic requests or live-rate polling on scroll. The gold number is labelled arbitrary/sample adjacent to it, not a current market rate or offer.

## 5. Motion engineering plan

Use GSAP/ScrollTrigger in isolated client components, loaded only where needed. GSAP documents media-query-conditioned animation and cleanup through matchMedia; use this to build and tear down each responsive timeline when conditions change. [GSAP matchMedia documentation](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/)

Our implementation policy is stricter than a generic animation demo: reduced motion removes pinning, parallax, scrub scaling and automatic horizontal translation. A visible motion preference can further reduce effects but never override an OS request with more motion. Reversing scroll must restore coherent content, not replay an intro on every route visit. Kill timelines/listeners on unmount; refresh geometry after image decode/font readiness and resize without changing reading order. No global smooth-scroll dependency is planned.

Reserve image dimensions; prioritize the first hero image, lazy-load later media and load AI/voice modules only when requested. Proposed targets: initial home transfer <=1.5MB excluding user-started media/API streams, initial compressed JS <=250KB, no animation-attributable repeated >50ms main-thread tasks in the profiled showcase device. These are acceptance budgets, not measured achievements; tradeoffs require evidence and review.

## 6. Asset checklist and design review gate

Needed: approved wordmark spelling/logo; six desktop/mobile-safe editorial compositions; consistent catalogue crops; permitted reference/concept example; craft/story copy; font delivery rights and fallback choices. Record actual crop dimensions and usage permission in the later asset manifest. Prefer AVIF/WebP derivatives with JPEG fallback where needed; no unverified 3D dependency.

Codex internal review and owner review should challenge: hierarchy at 320px/short viewport; ivory/gold contrast; product-image truthfulness; clear sample and custom-concept distinctions; keyboard alternatives for collection track/comparison; total pinned travel and performance feasibility. Phase 02 supplies tokens/components and the isolated browser preview; Phase 03 implements scenes. No Figma file or independent design review is claimed. Actual photographs, license sources and outstanding media requirements now live in [ASSETS.md](ASSETS.md).

## 7. Phase 02 foundation and Phase 03 implementation contract

### Implemented foundation

`/design-preview` remains the internal noindex Phase 02 study route with its hero/cards/collections/AURIA/palette/type/button/loading/replay specimens. Phase 03 replaces only `/`'s temporary redirect with the separate six-scene homepage. These studies are not seeded shop records. Menu, three-study search, in-page navigation and explanation dialogs operate locally. Native dialog supplies focus containment/Escape; no fake wishlist, purchase, send, upload or microphone control is presented.

The shell is an opaque sticky obsidian header in Phase 02, not an already-implemented transparent/scroll-state header. On mobile it becomes a compact wordmark/menu/search bar. Root metadata and response headers noindex the entire demo. The preview shares reusable button, section, product-card, icon, skeleton and modal foundations. Cormorant/Manrope, local licensed photography and precise spacing carry the identity; no borrowed luxury brand assets, glow effects or autoplay media are used.

Breakpoints are640/768/1024/1280px (`sm/md/lg/xl` tokens). Preview cards become one editorial column below768px; sections stack, dialogs fit the dynamic viewport, and hover effects run only on fine pointers. Header contrast is controlled. On the preview GSAP loads only for explicit replay. On home, GSAP/ScrollTrigger loads after first paint/fonts/hero readiness only if motion is allowed; text stays readable without it. No 3D renderer is imported. The home checkbox can reduce motion but never override OS preference.

### ScrollTrigger lifecycle (Phase 03 only)

1. Keep each scene's semantic text, image/poster and ordinary destination links server-rendered. Mount a small `HomepageMotion` client boundary around referenced elements; load GSAP and ScrollTrigger on that route only, after first paint and without hiding essential content while importing. Do not introduce ScrollSmoother, wheel interception or a global animation loop.
2. Wait for the hero/poster decode and font readiness before measuring. Use `gsap.matchMedia()` with `(min-width: 1024px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)` plus the site preference. On other conditions return the natural document layout. Rebuild only when media/layout eligibility changes, not every scroll event.
3. Register ScrollTrigger once, create timelines inside a GSAP context scoped to the home root, and revert/kill all tweens, triggers, resize observers and listeners on route unmount or preference change. Create preceding pins before downstream reveal/mask triggers so their ranges include pin spacing. Handle rapid navigation and resize without duplicate pins. Throttle/debounce geometry refresh after decoded images/fonts/settled resize; do not refresh continuously from a scroll handler.
4. S-02 gets at most80vh extra pin distance; S-04 gets at most100vh, total<=180vh. Use pin spacing so following sections never overlap. Start below the actual sticky header height, never pin navigation, and keep focused elements visible. A focused gallery card maps to its visible scroll position; test first/last controls, not only pointer movement.
5. S-04 measures `track.scrollWidth - viewport.clientWidth`; translate from0 to negative measured overflow only when positive. Links and previous/next controls retain ordinary accessible operation and visible focus. Avoid duplicate offscreen focusable content. Touch gets a native overflow track; reduced motion gets all six cards in flow. Geometry/labels must remain valid after a viewport change.
6. S-01 scales at most 1.03; S-02 parallax at most 6% of the framed media dimension. Animate transform/opacity, not width/top/filter/shadows. Keep readable text outside transformed media layers. Reserve a stable aspect ratio and avoid large `will-change` surfaces except while active. S-04/S-06 are normal flow with once-only optional reveals, never blank content if initialization fails.
7. Typography reveals use small <=12px offsets and <=650ms easing; preserve one accessible text copy and reveal by line/group, not hundreds of individually hidden letters. No scroll-based letter scrambling. Browser back/forward, interrupted scroll and reverse progress must leave content coherent.

### Photographic sequence versus genuine 3D

Choose one approved hero media path before implementation. The default feasible path is a high-quality still with subtle crop/parallax; still photography must not be described as a 3D rotation. A registered multi-angle image sequence is optional only after permission, consistent geometry and byte measurements. Decode a responsive subset ahead of the playhead, retain a poster, cap memory, pause when offscreen, and never preload an entire desktop sequence on a phone. A failed frame must show the poster, not an empty canvas.

Genuine 3D remains optional and absent: require approved optimized GLB/glTF, materials, rights, fidelity review, context-loss handling and a poster fallback before adding a renderer. No Three.js, WebGL model,360 rotation or pre-rendered frame sequence is used in Phase 03. Actual techniques are photographic plane transforms, masks, CSS perspective/tilt and GSAP parallax/scrub. Original line illustrations are code-native2D vectors, not generated imagery, products or CAD. S-05's visible caption distinguishes this metaphor from an actual AI result.

### Accessibility, performance and verification budgets

| Area | Required evidence in Phase 03 |
|---|---|
| Reduced motion | OS request and site toggle remove every pin/parallax/scrub/auto-horizontal effect immediately, including after initialization; content/links unchanged |
| Mobile | 320/390/768px and short-height landscape: static hero, native/stacked collections, no hover-only information, no sideways document overflow |
| Desktop | 1024/1440px plus short viewport; two pins maximum, <=180vh added travel, no header collision or inaccessible links; resize/unmount leaves no spacer residue |
| Media | First hero prioritized with stable dimensions; later images lazy; no autoplay sound, paid calls or mic permission on scroll; poster/error fallback tested |
| Transfer | Home initial compressed transfer <=1.5MB including fonts/images/JS, excluding explicit user-started media/API streams; initial compressed JS <=250KB; report cold-cache measurement, do not assume budgets pass |
| Optional sequence/3D | Separate opt-in/deferred payload target <=4MB; memory target <=64MB decoded media; if missed, use still; only profile on an agreed showcase device |
| Main thread | No animation-attributable repeated >50ms tasks in the agreed device profile; avoid frame-by-frame React state updates; idle scene has no rendering loop |
| Web vitals | Target LCP <=2.5s, CLS <=0.1, INP <=200ms; lab checks are not a field/p75 claim; record device/network and failures |
| Regression | Production build/types/lint, keyboard/dialog checks, automated accessibility, no console/page errors, missing-media fallback, motion/resize/navigation test and desktop/mobile screenshot review |

These budgets were not measured Phase 02 achievements. Phase 03's actual local results and limitations are recorded in PROJECT_STATE.md: transfer/JS/CLS budgets passed, but a full-suite LCP sample missed the goal and startup long tasks remain a profiling follow-up. Do not equate passing functional tests with field performance certification. Owner assets, truthful copy and final media approval still gate the showcase. Backend availability does not gate a static cinematic homepage; catalogue, AI, voice, gold and admin implementation remain outside Phase 03.

## 8. Phase 04 Design Vault implementation

Preserve the installed tokens/preview and six home scenes. Catalogue art direction is a quieter ivory editorial volume: serif two-line entrance, a slightly tilted framed concept, native category rail, precise search/sort controls, desktop refinement column and clean square jewellery frames. Cards prioritize the image, title and an explicit sample availability line. Gold accents carry hierarchy, not a fabricated price/stock urgency. Four collection edits use the same cards/data with asymmetric index layouts and burgundy/obsidian/ivory headers. No new brand palette, logo, SaaS styling, heavy grid motion or renderer.

Only11 original image-backed synthetic designs are published by the user's reduced-asset decision; remaining category directions have honest empty states. AI media provenance and sample stock are distinct adjacent labels. One real read-only preview dialog shows the full concept, neutral description, sample purity/variant differences and unknown specifications. It has no fake quotation/customization/wishlist control; product forms remain Phase 05.

Desktop shows a sticky refinement column and up to3 product columns; tablets use a filter drawer and2–3 columns, narrow phones one legible card per row. Drawer shares the existing native modal, labelled controls, focus containment/Escape/return. Responsive picture sources use local480/960px WebP assets, stable square frames and lazy loading; hero is eager. Image failures retain a designed information-first composition. Search/filter requests display real skeleton/error/retry/empty states; page and query links have native no-JS alternatives.

Motion is limited to a1.025 fine-pointer image hover and a4px/260ms translation on the first3 cards of a bounded page, with no opacity readability loss. Reduced motion removes all such movement; no GSAP is imported for catalogue browsing. Cursors keep the default12/max48-card DOM bounded instead of an ever-growing appended list. Current timing/axe/screenshot outcomes live only in PROJECT_STATE; this description is not an independent visual approval.
