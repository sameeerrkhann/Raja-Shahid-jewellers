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
| S-07 | 2026-11-18 | "Worn" story after the hero: select a piece (or "See it worn") and a pinned scroll scene opens a portrait frame and carries the piece to where it is worn, then shows its details; picker to switch pieces. Illustrated fitting study until the shop supplies on-model photos (`src/data/demo/on-model.ts`) | In review | `src/components/home/worn-story.tsx`, `src/components/home/wear-figure.tsx`, `src/app/worn.css`, `src/data/demo/on-model.ts` |
| S-08 | 2026-11-18 | Craft scene rebuilt as a jeweller's loupe: scroll or select Form / Light / Feeling and a 2.5× lens glides over the photograph | In review | `src/components/home/craft-loupe.tsx`, `src/app/home.css` |
| S-09 | 2026-11-18 | Category gallery shows real published sample designs (counts, subcategories, medallions that open each design in the Design Vault) | In review | `src/components/home/vault-gallery.tsx`, `src/lib/catalogue/showcase.ts` |
| S-10 | 2026-11-18 | Lighter header (76px, column-aligned rule, sentence-case links); numbered all-caps section labels removed site-wide; collections page as a row of 4:5 frames; luxury reveal easing, 1.04 card hover with title underline, CTA fill sweep | In review | `src/app/globals.css`, `src/app/catalogue.css`, `src/styles/tokens.css`, catalogue components |
| S-02 | 2026-11-17 | Premium header/navbar: gold hairline, glass-on-scroll, ornamented wordmark, animated link underline, pill "Meet AURIA" and round search button; the demo strip now joins the dark hero | In review | `src/components/layout/site-header.tsx`, `src/app/globals.css`, `src/app/showcase.css` |
| S-01 | 2026-11-17 | Interactive "turning vault" hero: a 3D orbit of the 11 sample designs (necklaces, sets, rings, bangles). Scroll turns it on desktop (pinned, snaps to each piece); drag/swipe, arrows, keyboard and tap on mobile; product name, category, description, code and sample status update live; "Look closer" opens a zoom-and-pan viewer. Frame-rate independent motion; reduced-motion and no-JS fallbacks | In review | `src/components/home/showcase-hero.tsx`, `src/components/home/showcase-viewer.tsx`, `src/lib/catalogue/showcase.ts`, `src/app/showcase.css`, `src/app/page.tsx`, `src/components/motion/homepage-motion.tsx`, `tests/homepage.spec.ts` |
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

**Owner:** Codex for Sameer, branch `codex/auria-ai-01` from Saad e672f94.
**Scope:** AI-01 free-tier text foundation only. Saad retains non-AI ownership. Only the AURIA homepage/header entry points change; existing home animation and catalogue remain. Order tools expand in AI-03; voice later; images last. No paid APIs/admin.

| # | Date | Task | Status | Main files |
|---|------|------|--------|------------|
| AI-01 | 2026-11-19 | Persistent private chat workspace, Gemini adapter, existing-catalogue tools and explicit fictional quote drafts; live verification/QA | In progress | src/components/auria, src/lib/auria, src/lib/server/auria, src/app/ai-atelier, src/app/api/ai, tests/auria*, canonical docs/state |

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
