# Raja Shahid Jewellers — Team Task Board

> Every contributor keeps their own section here. Add each change you make as a row with its date, status and the files it touched, newest first. Status values: **Done** (merged), **In review** (pull request open), **In progress**, **Blocked**, **Next**.
>
> Detailed technical handoffs (tests, evidence, decisions) still go in `PROJECT_STATE.md`. This board is the quick "who is doing what" view.

---

## Saad Works — Customer Website (non-AI)

**Role:** Non-AI customer website — Phase 04 Design Vault, Phase 05 product details & custom orders, gold services UI, customer pages, UI/UX & animation.
**Branch:** `saad-works-customer-website` (opened as a pull request; merged into `main` only after team review)
**Current focus:** Showcase hero + premium header in review → Phase 05 once approved.

| # | Date | Task | Status | Main files |
|---|------|------|--------|------------|
| S-12 | 2026-11-18 | Step 1 of the agreed plan: removed the craft loupe and worn-story scenes (homepage now 5 scenes, 1 desktop pin); "The craft" nav link replaced by "Bridal edit"; six free Pexels reference model photos (3 women, 3 men) added with credits for the Dual Portal | Done (in review) | `src/app/page.tsx`, `src/app/home.css`, `src/data/demo/model-photography.ts`, `public/images/models/` |
| S-18 | 2026-11-19 | Hero 2.0 + velvet palette (kohl, oxblood, antique gold): five scroll acts (field → converge with camera push → light-sweep reveal → piece at centre stage with four image-based notes, leader lines and catalogue facts → collections), near/far depth layers, dust that parts around the cursor, cursor tilt and highlight on the gold, ~1100px desktop travel; hero piece configurable in `src/config/hero.ts` | Done (in review) | `src/components/home/golden-assembly.tsx`, `src/app/assembly.css`, `src/config/hero.ts`, `src/styles/tokens.css`, `public/images/hero/` |
| S-19 | 2026-11-19 | Design package step 1: hero lengthened to ~2,000px with four caption bands (scatter, blur to sharp, word rise), scrims and text-shadow token; flick test and worst-frame contrast audit added as tests | Done (in review) | `src/components/home/golden-assembly.tsx`, `src/app/assembly.css`, `tests/hero-captions.spec.ts`, `docs/DESIGN-PACKAGE.md` |
| S-20 | 2026-11-22 | Long-scroll homepage: ring film scrub (Google Flow concept video), collection arc, lens with product dropdown, Try it on (women/men, zoom and name), compact closing pills; Golden Assembly removed | Done (in review) | `src/components/home/scroll-showcase.tsx`, `src/components/home/try-on.tsx`, `src/config/showcase.ts`, `src/app/showcase.css` |
| S-21 | 2026-11-22 | Homepage polish: dark review strip, See it on with real worn photographs + zoom, 3D bridal jewellery box scene, AURIA design shell | Done (in review) | `src/components/home/try-on.tsx`, `src/components/home/bridal-box.tsx`, `src/app/showcase.css`, `src/app/home.css` |
| S-22 | 2026-11-26 | Hero vault film (Google Flow, graded) with 10k-standard bands and scroll effects; See it on with one AI model each | Done (in review) | `src/components/home/scroll-showcase.tsx`, `src/components/home/try-on.tsx`, `src/config/showcase.ts`, `public/images/hero/vault/` |
| S-23 | 2026-11-26 | Image audit; editorial photos replaced with AI images in the charcoal and gold palette | Done (in review) | `public/images/editorial/`, `src/config/preview-studies.ts`, `src/config/home.ts` |
| S-24 | 2026-11-26 | Inner pages: vault-stage heroes, scroll motion (progress, reveals, parallax, collections runway), hover sheen | Done (in review) | `src/components/motion/page-motion.tsx`, `src/app/catalogue.css` |
| S-25 | 2026-11-27 | Live Pakistan gold rates: /gold-rates page, homepage panel, header chip, value calculator, honest unavailable/stale/sample states | Done (in review) | `src/components/gold/`, `src/lib/server/gold-rate.ts`, `src/app/gold-rates/` |
| S-26 | 2026-11-27 | Client polish: text cleanup, scroll reset, new footer, visit/enquiry forms (not connected), See it on loupe and details, collections chapters, hero fly-over | Done (in review) | `src/components/services/`, `src/components/layout/`, `src/components/catalogue/collection-chapters.tsx` |
| S-27 | 2026-11-28 | scroll-craft principles: hero near-plane depth and pointer parallax, collections lamp, em-dash/counter/scroll-cue cleanup | Done (in review) | `src/components/home/scroll-showcase.tsx`, `public/images/hero/planes/` |
| S-28 | 2026-11-28 | Hero clarity: remove dust plane, sharper 1440 frames from lossless source, capped canvas, lighter prefetch; utility bar fix | Done (in review) | `public/images/hero/vault/`, `src/components/home/scroll-showcase.tsx` |
| S-29 | 2026-11-28 | Hero scroll blur: single-frame paint, no canvas scale or punch, softer warp | Done (in review) | `src/components/home/scroll-showcase.tsx` |
| S-13 | — | Design package step 2: Dual Portal (Women \| Men \| Made to order) with the reference model photos, labelled as reference photography | Next | — |
| S-14 | — | Design package step 3: the Touchstone (gold streak, four buyer questions) and an illustrative gold-rate panel | Next | — |
| S-15 | — | Design package step 4: Signature pieces rail and detail drawer (shadcn Sheet), real sample data only | Next | — |
| S-16 | — | Design package step 5: Bridal, the Vault in 3D, AURIA band (design only), Visit or commission, footer | Next | — |
| S-17 | — | Design package step 6: 12-point self-test and copy gate, then PR | Next | — |
| S-11 | 2026-11-18 | Hero replaced with "Golden Particles Assembly" (team concept 07): ~5,000 gold particles sampled from the Mehr Crescent Collar photograph gather on scroll, the photo is uncovered behind a band of light, then category tiles with real sample counts rise in. Scroll-scrubbed and reversible, ~760px desktop travel, Lenis smooth scrolling, autoplay on mobile, finished frame for reduced motion / no JS. Orbit hero removed | In review | `src/components/home/golden-assembly.tsx`, `src/app/assembly.css`, `public/images/hero/`, `src/components/motion/homepage-motion.tsx`, `tests/homepage.spec.ts` |
| S-07 | 2026-11-18 | (Removed in S-12) "Worn" story after the hero: select a piece (or "See it worn") and a pinned scroll scene opens a portrait frame and carries the piece to where it is worn, then shows its details; picker to switch pieces. Illustrated fitting study until the shop supplies on-model photos (`src/data/demo/on-model.ts`) | In review | `src/components/home/worn-story.tsx`, `src/components/home/wear-figure.tsx`, `src/app/worn.css`, `src/data/demo/on-model.ts` |
| S-08 | 2026-11-18 | (Removed in S-12) Craft scene rebuilt as a jeweller's loupe: scroll or select Form / Light / Feeling and a 2.5× lens glides over the photograph | In review | `src/components/home/craft-loupe.tsx`, `src/app/home.css` |
| S-09 | 2026-11-18 | Category gallery shows real published sample designs (counts, subcategories, medallions that open each design in the Design Vault) | In review | `src/components/home/vault-gallery.tsx`, `src/lib/catalogue/showcase.ts` |
| S-10 | 2026-11-18 | Lighter header (76px, column-aligned rule, sentence-case links); numbered all-caps section labels removed site-wide; collections page as a row of 4:5 frames; luxury reveal easing, 1.04 card hover with title underline, CTA fill sweep | In review | `src/app/globals.css`, `src/app/catalogue.css`, `src/styles/tokens.css`, catalogue components |
| S-02 | 2026-11-17 | Premium header/navbar: gold hairline, glass-on-scroll, ornamented wordmark, animated link underline, pill "Meet AURIA" and round search button; the demo strip now joins the dark hero | In review | `src/components/layout/site-header.tsx`, `src/app/globals.css`, `src/app/showcase.css` |
| S-01 | 2026-11-17 | (Superseded by S-11) Interactive "turning vault" hero: a 3D orbit of the 11 sample designs (necklaces, sets, rings, bangles). Scroll turns it on desktop (pinned, snaps to each piece); drag/swipe, arrows, keyboard and tap on mobile; product name, category, description, code and sample status update live; "Look closer" opens a zoom-and-pan viewer. Frame-rate independent motion; reduced-motion and no-JS fallbacks | In review | `src/components/home/showcase-hero.tsx`, `src/components/home/showcase-viewer.tsx`, `src/lib/catalogue/showcase.ts`, `src/app/showcase.css`, `src/app/page.tsx`, `src/components/motion/homepage-motion.tsx`, `tests/homepage.spec.ts` |
| S-04 | — | Phase 05: product detail pages, made-to-order and custom-order enquiry flow | Next | — |
| S-05 | — | Customer modules: wishlist, comparison, WhatsApp enquiry, appointments, contact/about/FAQ, order tracking | Next | — |
| S-06 | — | Gold services UI: rate display (illustrative vs live), tola/gram conversion, value calculator, financing information | Next | — |

---

## Sameer — Phase 04 Design Vault & repository

**Role:** Repository owner; Phase 04 Design Vault (Codex-assisted).

| # | Date | Task | Status | Main files |
|---|------|------|--------|------------|
| M-01 | 2026-11-17 | Phase 04 Design Vault verification: fixed the catalogue browser failures, no-JS sidebar overlap, accessible card/menu names; 79/79 tests (`a28fdea`, `d8773fa`) | Done | `src/components/catalogue/*`, `tests/catalogue.spec.ts` |

_Sameer: please correct or extend this section._

---

## AI development — AURIA (assigned separately)

**Owner:** _add name_
**Scope:** AURIA chatbot, AI image generation/analysis, AI search, voice, AI backend. Not part of Saad's assignment; existing AURIA placeholders are kept intact.

| # | Date | Task | Status | Main files |
|---|------|------|--------|------------|
| — | — | _add tasks here_ | — | — |

---

## Other contributors

Copy the section template below for each new person.

```md
## Name — Area

**Role:**
**Branch:**
**Current focus:**

| # | Date | Task | Status | Main files |
|---|------|------|--------|------------|
```
