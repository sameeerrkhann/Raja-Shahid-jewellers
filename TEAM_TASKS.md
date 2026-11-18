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
| S-13 | — | Step 2: Dual Portal (Women / Men / Atelier) under the hero | Next | — |
| S-14 | — | Step 3: pinned horizontal collection cards with gold shimmer | Next | — |
| S-15 | — | Step 4: product detail drawer (shadcn Sheet), real sample data only | Next | — |
| S-16 | — | Step 5: Bridal, AURIA and Gold sections redesigned | Next | — |
| S-17 | — | Step 6: mobile, performance and typography pass, then PR | Next | — |
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
