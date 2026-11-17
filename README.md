# Raja Shahid Jewellers — Visual Atelier

Customer-facing demo by Neural Stack & Co. Phases 02–04 provide the design foundation, six-scene cinematic homepage and premium sample Design Vault. AURIA remains a working concierge name. No admin portal, full product/customization/quotation flow, AI backend, voice or live gold service is implemented.

## Local preview

Use Node 22.14+ within the Node 22 release line and pnpm 10.33.0 (the verified machine runs Node 22.22.1). From this project root:

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd dev
```

Open the [homepage](http://127.0.0.1:3000/), [Design Vault](http://127.0.0.1:3000/designs), [collections](http://127.0.0.1:3000/collections) or [Bridal Edit](http://127.0.0.1:3000/collections/the-bridal-edit). The original [design preview](http://127.0.0.1:3000/design-preview) remains separate. All content stays noindex/nofollow: review pages, not authenticated private areas, containing no private customer data.

No environment file or API credential is needed. `next/font/google` downloads Cormorant Garamond and Manrope at development/build time, then serves them locally. Initial setup/build needs network access for dependencies/fonts. Images are already local. Do not copy private keys into public configuration.

## Checks

```powershell
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd build
pnpm.cmd test
```

Browser tests start the built production app on port 3100; build first. On this Windows machine they use installed Microsoft Edge in headless mode. `PLAYWRIGHT_BROWSER_CHANNEL=chrome` can select Chrome. On a machine without a supported browser, install Playwright Chromium with `pnpm.cmd exec playwright install chromium` and set `PLAYWRIGHT_BROWSER_CHANNEL=chromium`. Use the equivalent environment syntax for your shell. Test screenshots/traces are in ignored `test-results/`, and the HTML report in ignored `playwright-report/`.

For a manual production preview use `pnpm.cmd build`, then `pnpm.cmd start`. Development defaults to port 3000. Never deploy this internal preview as an approved storefront without the phase/sign-off checks.

## What works in this foundation

- Catalogue landing, six-category navigation, four editorial collections, responsive cards and a real read-only design preview.
- Server-side search by name/design ID/keywords; combined category/subcategory/collection/style/occasion/purity/availability filters, sorting, URL state, Back/Forward and bounded cursor pages (12 default,48 maximum).
- Mobile filter drawer with apply/clear/focus return; genuine loading, empty, error/retry, image fallback, keyboard and reduced-motion states. Native no-JS links/forms retain basic browsing.
- Five read-only same-origin catalogue APIs backed by local public fixtures, not a database. Design and physical stock are separate; sample purity/status filtering evaluates the same eligible variant.
- Eleven distinct AI-generated concept images and published SAMPLE designs, approved by the user as the smaller seed after the built-in image service failed. Fourteen remaining briefs are unpublished; no duplicated padding or broken cards. Necklaces/Earrings/Men's currently have honest empty states. Prices, weights and lead times are unknown/null; sample stock/manufacturing is never a real-shop claim.
- Six connected home scenes: Royal Entrance, Craftsmanship, Bridal Heritage, Design Vault, AURIA, Gold & Final Invitation.
- Route-local GSAP/ScrollTrigger, two bounded desktop pins, horizontal gallery controls/focus behavior, photographic parallax and an illustrative sketch/reference mask reveal.
- Mobile-specific layouts/native gallery; reduced motion removes pin/scrub/parallax and puts all category directions into flow.
- Real chapter navigation and accessible availability explanations for future categories/AURIA/appointments/enquiries; no submission or fake connection.
- Designed missing-image fallback and no-script homepage reading/links/category list. The preserved loading boundary now lives under `src/app/design-preview/loading.tsx`, not above the homepage.

- Responsive header/footer and navigation to actual preview sections.
- Native modal menu, real public catalogue search, and the original three-study search/image dialogs on the internal preview.
- Reusable light/dark section, button, card, icon, modal and loading components.
- Licensed local reference photography with attribution and no stock/pricing claims.
- Optional GSAP typography replay, device reduced-motion support and an additional preview toggle.
- AURIA interface concept with an explanatory dialog; its composer is deliberately non-interactive.

## Source map

| Path | Responsibility |
|---|---|
| `src/app` | Root layout, homepage/home.css, catalogue.css, designs/collections/API routes and scoped error states, preserved internal preview/loading/not-found |
| `src/styles/tokens.css` | Canonical Tailwind/CSS colors, typography bindings, spacing, shadows, borders, motion and breakpoints |
| `src/config` | Central brand strings, implemented preview navigation and editorial reference metadata |
| `src/components/ui` | Buttons, sections, modal, icons and skeletons |
| `src/components/layout` | Global header/footer and local search/menu |
| `src/components/catalogue` | Catalogue hero, cards, query controls/drawer, native states, concept preview and original Phase 02 card |
| `src/types/catalogue.ts` | Safe design/variant/stock/media/query/result contracts |
| `src/data/demo` | Synthetic briefs/stock/collections plus generated-image prompts/provenance/checksums |
| `src/lib/catalogue` | Pure query validation and design-versus-stock projection/filter/sort |
| `src/lib/server/catalogue.ts` | Replaceable local repository, bounded cursor results and safe public projections |
| `src/components/preview` | Reference gallery, AURIA concept and design-language specimens |
| `src/components/motion` | Lazy home ScrollTrigger lifecycle/cleanup plus explicit Phase 02 typography replay |
| `src/components/home` | Homepage presentation shell, original line studies, image fallback and native category gallery |
| `public/images/editorial` | Three unchanged reference photographs and prebuilt responsive hero derivatives |
| `public/images/catalogue` | Eleven original synthetic concepts,480/960px local WebP variants |
| `scripts` | Repeatable generated-asset derivative preparation and local homepage LCP attribution |
| `tests` | Responsive, interaction, source-honesty and automated accessibility checks |

The eight planning documents remain indexed in [docs/PRD.md](docs/PRD.md). [DESIGN](docs/DESIGN.md) owns visual/motion treatment; [ASSETS](docs/ASSETS.md) and [catalogue asset manifest](src/data/demo/catalogue-assets.json) own provenance/prompts/checksums. [PROJECT_STATE.md](PROJECT_STATE.md) owns actual results, limitations and the Phase 05 handoff. Current screenshots: ignored `artifacts/phase04/final/`; earlier home evidence: `artifacts/phase03/before/` and `final/`. Generate structured results with `$env:PLAYWRIGHT_JSON_OUTPUT_FILE='artifacts/phase04/verified-final-results.json'; pnpm.cmd test --output=artifacts/phase04/verified-final --reporter=list,html,json`. Never run simultaneous verification sessions against this checkout's build/report paths.

Homepage profiling: start the built app with `pnpm.cmd start --port 3101`, then in another terminal run `node scripts/profile-home.mjs http://127.0.0.1:3101 after 3`. Reports are in `artifacts/phase04/performance/`. It measures an unthrottled local browser, not real-mobile/field/p75 evidence. Phase 03's3.08s LCP miss is retained; Phase 04's prebuilt responsive hero bypasses the measured dynamic-transform path. Consult PROJECT_STATE for actual before/after numbers rather than assuming the target is solved.

Asset derivation needs no API call: `node scripts/prepare-catalogue-assets.mjs '<existing built-in generated-images folder>'`. It reads the manifest, creates missing480/960px WebP outputs plus hero variants, preserves originals/existing outputs and writes an ignored audit. Runtime needs only the saved public files. No image API credential or CLI generation fallback was used; the user chose the11 completed images.

## Boundaries and maintenance

Only home, Design Vault, collection index/four collection slugs and internal preview are implemented. Product detail, made-to-order, wishlist and other planned customer routes remain unbuilt; cards use a real preview dialog with an individual-filter native link, never a dead product link. Home gallery directions still use reference/vector art, not physical-stock records. AURIA's reveal remains hand-authored, not AI output. No genuine3D/sequence is used: home depth is simulated2.5D. Final client photography, brand spelling/identity, shop specifications/contact and rights/legal approval remain pending. The current local repository is not production persistence, private ownership/security or proven database scalability.

The gold number is arbitrary and clearly illustrative—not a live source, current price, valuation or financing offer. Appointment/enquiry CTAs explain unavailability; no booking or message is sent. No send/microphone/upload action is implemented in AURIA. The current Permissions-Policy disables microphone/camera/geolocation; Phase 08 must deliberately revise/test it for verified voice.

Codex is the primary development agent. Historical Claude instructions/review briefs are retired, retained for context. Before editing, read AGENTS.md and PROJECT_STATE.md; preserve prior logs and stop at the authorized phase. Git `main` tracks the user-selected [GitHub repository](https://github.com/sameeerrkhann/Raja-Shahid-jewellers). A source push is not a hosted deployment or phase sign-off. Commit/push only within the user's authorization; never include secrets or generated reports.

Next.js 16.4.6 appends its version-specific guidance block to the existing AGENTS.md on first development startup; the repository rules are preserved above it. Read the relevant installed `node_modules/next/dist/docs` guides before coding. On this machine the sandbox-created `.git` has a different Windows owner from the elevated shell. Use a per-command exception for this exact trusted repository if Git reports dubious ownership; do not disable ownership checks globally.

ESLint 9.39.5 is pinned for the installed Next.js React/accessibility plugins, whose declared peer ranges do not accept ESLint 10. The registry marks ESLint 9 deprecated. Track the compatible plugin/config upgrade rather than ignoring peer checks. TypeScript 5.9.3 is pinned and verified; all packages and the pnpm lockfile are explicit. This toolchain note is not a production security certification.
