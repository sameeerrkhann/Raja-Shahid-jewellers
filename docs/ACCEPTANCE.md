# Verification, acceptance and internal review

Status: Phase 04 catalogue verification, 2026-11-17; Codex internal review only. Detailed actual outcomes/failures/corrections live in PROJECT_STATE.md. Phase 02/03 regression checks remain. Provider/private-database/financial/product-quotation checks below are still future work, not passed by the public sample catalogue. [PRD.md](PRD.md) owns requirements; this document owns required evidence.

## 1. Requirement traceability

| Requirement | Owning detail / journey | Required evidence and implementation phase |
|---|---|---|
| R-01 | UX global/routes; DESIGN S-01–S-06; J-A | Responsive home/story/collections links, six scenes and static alternatives; Phases 02–03 |
| R-02 | UX vault/detail; DATA_MODEL seed; J-A/J-B | Defensible seeded count/provenance, real query/filter/cursor/deep-link tests; Phase 04 |
| R-03 | DATA_MODEL fulfilment projection; J-B | Matrix of sample/approved stock, variant availability and custom concepts; no quote stock reservation; Phases 04–05 |
| R-04 | PRD quote workflow; API quotes; J-B | Saved receipt after commit, duplicate retry same receipt, source snapshot immutable and owner-only confirmation; Phase 05 |
| R-05 | AI typed tools; J-C | Actual two-turn provider call, correct seeded IDs, unknown policy/stock handling, no secret/tool escalation; Phase 06 |
| R-06 | AI vision/retrieval; J-D | Actual permitted-image analysis, attribute-match explanation and zero-match case; Phase 07 |
| R-07 | AI jobs/revisions; J-C/J-D | Actual generate/edit outputs, parent input evidence, reload/compare/save/quote binding and failed-job recovery; Phase 07 |
| R-08 | AI voice; J-E | Actual bidirectional speech, interrupt/mute/end, same conversation and backend termination/usage; Phase 08 |
| R-09 | UX gold; API snapshot/calculation; J-F | Source/mode/time/freshness shown, decimal calculation verified, no silent live/sample switch; Phase 09 |
| R-10 | PRD enquiries; API forms; J-F | Saved valuation/financing/general/appointment requests; no booking/lending/delivery claims; Phase 09 |
| R-11 | UX wishlist/owned pages/sample tracking | Persistence after reload in active session, ownership isolation, fixed labelled synthetic order; Phase 09 |
| R-12 | UX states; DESIGN fallbacks | Keyboard/reduced-motion/mobile/error/offline/permissions and Urdu-content review; every feature phase |
| R-13 | ARCHITECTURE private boundary; API common rules | Two-owner and pooled-context negative tests, uploads/quotas/consent/redaction/cleanup; every backend phase |
| R-14 | This plan | Reproducible automated results, manual evidence, known limitations and deployment environment recorded; Phase 10 |

## 2. Planned automated verification

Unit tests: fulfilment projection across stock origins/variants; option compatibility; decimal valuation and round-on-display rules; invalid mass/purity; approved tola convention only; quote source union; required contact/consent; stale-rate policy; provenance labels; expiry/date-zone handling. Fixed sample numbers are arithmetic fixtures, never current prices. Example arithmetic test can use arbitrary rate100 monetary units/gram ×10g ×22/24; expected exact value before rounding is 916.666… units, with sample labels and exclusions maintained.

Database/contract tests: migration on an isolated test database; repeatable seed import; FK/check/unique constraints; runtime role cannot bypass ownership; no-context read denied; two guest sessions cannot read each other's quote/message/job/media; pooled session A context cannot leak to session B; same quote idempotency key/body produces one record; mismatch409; concurrent quota reservations do not exceed allowance; source edit/archive does not change prior quote snapshot; duplicate wishlist save yields one row.

API tests: every documented method has happy-path shape, malformed/oversize/unknown-field cases and relevant401/403/404/409/429/503 behavior. Test invalid UUIDs/cursors, unpublished content, CSRF/wrong Origin, foreign revision/attachment, spoofed owner/status/price, false contact delivery success, expired policy version, signed upload path/size/type bypass and malicious image metadata. Fetching a stream/job must not start paid work. Public capabilities reveal no secrets.

Job tests: worker unavailable rejects new paid jobs; worker restart/lease loss; provider timeout before versus after acceptance; duplicate delivery; completed provider output with failed storage; cancellation races; branching edits; failed parent; partial media upload; reconciliation-required status; reservation/actual cost reconciliation. Fault injection with mocks proves failure behavior only; actual generation needs separate live evidence.

End-to-end tests: J-A through J-F using an isolated synthetic seed, two browser contexts and deterministic provider adapters where appropriate. Reload deep links, back/forward filters, invalid option, draft recovery, owned confirmation, wishlist toggle, selected AI revision, sample tracking reference, empty search and dependency outages. No production customer data in recordings/screenshots.

## 3. Manual and live integration matrix

| Check | Pass criterion | Evidence / limitation |
|---|---|---|
| Desktop/tablet/mobile | 320, 390, 768, 1024, 1440px; portrait/landscape; no clipped content or page overflow | Screenshots plus interactive checks; real Android Chrome and iPhone Safari where available; unavailable devices disclosed |
| Accessibility | Keyboard all key tasks; visible focus/labels; modal focus restore; status not color-only; 200% text and400% browser zoom; AA contrast | Automated axe candidate plus manual screen reader/keyboard; no automatic compliance claim |
| Motion | Reduced motion removes pin/parallax/scrub/forced horizontal travel; same destinations; resize/unmount cleanup | Compare desktop/motion and static paths; no-JS basic reading/navigation |
| Performance | Proposed p75 goals LCP<=2.5s, INP<=200ms, CLS<=0.1; home <=1.5MB initial transfer / <=250KB compressed initial JS | Lab profiling on documented mobile/network first; true p75 needs field sample, not one Lighthouse run; disclose unavailable field evidence |
| Chat | Two turns retrieve valid seeded designs and preserve chosen style; unavailable facts admitted | Redacted provider request IDs/tool results, no fabricated cards |
| Vision/image | Actual uploaded-reference analysis; new image then real edit of selected parent; private reload works | Actual outputs and parent relationship; mocks do not count |
| Voice | English, Urdu, Roman Urdu scenarios; audible exchange; interrupt/mute/end; typed continuation | Evaluate meaning/task completion with a competent speaker; transcript alone does not prove spoken quality |
| Voice shutdown | Local mic stopped; backend remote termination and usage finalization; expired/hostile client contained | Browser timer alone fails; if unverified, mark voice blocked/unavailable |
| Gold | Connected approved source OR explicit sample; displayed timestamp/locality/currency match snapshot | External live access not required for labelled sample acceptance; live label requires real source evidence |
| Forms | Real durable demo save; invalid fields clear; no double submit; no false delivered/confirmed state | DB/read-after-write proof; notification absence disclosed |
| Privacy/security | No secret in client/network/logs; private media/contacts inaccessible across owners; cleanup verified | Redacted security checks, never publish real keys/PII as evidence |

Performance targets are project goals, not verified measurements or hosting guarantees. A failed target needs a measured issue and an explicit tradeoff, not an unexplained PASS.

## 4. AI evaluation cases

Evaluate at least: lightweight wedding ring request in English/Urdu/Roman Urdu; budget without known product price; claimed stock contradiction; desired date with unknown lead time; uploaded imitation stone image; prompt injection in image/catalogue text; request for another customer's quote; unsupported loan promise; no catalogue match; refinement of a non-latest selected revision; interrupted speech with tool still pending; quota exceeded during concurrent image requests. Expected behavior uses approved facts, asks for clarification or declines unsupported claims, never upgrades sample data into reality. Record pass/fail per case and redacted model/config version. Fluent Urdu and accurate retrieval are evaluation goals, not assumptions from model marketing.

## 5. Release and phase gates

Phase 01 checks: eight canonical documents present; local links resolve; all 12 requested topics have an owner; all 14 requirements traced; routes/actions align with APIs. Codex internal review replaced the originally proposed independent review by user instruction on 2026-11-17. Owner decisions remain separate; internal review is not independent sign-off.

Phase 02 setup gate after review: approved decisions or explicit scoped assumptions; deliberate Git setup; manifest/lockfile/ignore rules; typed configuration and documented commands; initial design tokens/asset plan. Later feature phases need appropriate unit/contract/browser evidence. At showcase sign-off all six journeys must pass in their declared mode. Real AI requirements cannot pass with mock providers; gold can pass in explicit sample mode per scope. Any reduced showcase requires an explicit omission list and owner decision.

Phase 02 scripts now exist: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test` (Playwright with axe, after a build), and `pnpm check` (types + lint + build). See package.json/README for pinned tooling and commands. No unit/database/live-provider suite exists yet; Vitest remains a candidate, not an installed dependency. Live tests need a controlled budget and permitted fixtures; no uncontrolled repeated API calls.

## 6. Active Codex review and next-session handoff

Codex is the primary developer for every remaining phase. Label its reviews **Codex internal review**, record findings/evidence in PROJECT_STATE.md and preserve earlier logs. The user explicitly authorized Phase 02 after that internal review. Use the existing traceability and live-evidence requirements; a visual preview does not satisfy later catalogue/AI/gold requirements. Review phase outputs against scope, responsive/keyboard behavior, source honesty, runtime boundaries and measured checks. Flag unresolved owner/provider decisions at the phase where they are needed; do not silently claim approval.

Phase 02 checks: preview accessible; temporary root redirect was intentional then and is replaced by Phase 03's homepage; metadata noindex; navigation anchors valid; menu/search/dialog Escape and focus restoration; all local images decoded; no page overflow at 320/390/768/1024/1440px; AURIA has a labelled non-interactive concept composer and no send/mic controls; light/dark contrast checked; reduced-motion path; TypeScript/lint/build results recorded. Browser automation and screenshot inspection are evidence of tested viewports, not real-device or screen-reader certification. Keep actual pass/fail counts and known limitations in PROJECT_STATE.md rather than duplicating a changing results log here.

### Phase 03 homepage checks

Six canonical scenes at `/`, original internal preview preserved; semantic heading/metadata/source labels; implemented chapter destinations only. Capture actual browser screenshots before implementation and after at320/375/390/768/1024/1440px. Check initial hero, all scenes/footer, mobile navigation, photographic decode/error fallback and no document overflow.

Desktop evidence: exactly two pins, combined added travel<=180vh; scrubbed hero scale, bridal parallax, horizontal gallery buttons and focused-card visibility; labelled sketch/reference mask progression. Mobile/short-screen: no desktop pins, native gallery controls. OS or site reduced motion removes every pin/forced translation, preserves all categories, and cannot be overridden by unchecking the site preference. Resize and real client route changes leave no pin spacers, duplicate timelines or body lock.

Automation covers honest future-service dialogs/no POST or external-service requests, page/dialog WCAG2/2.1 A/AA scans, local transfer including preloaded JS, CLS/LCP and observed scroll-window long tasks. Text reveals must retain contrast even offscreen; no rules suppressed. No-script verification requires visible story and working native anchors, not merely hidden DOM nodes. Scope loading boundaries so the static homepage does not depend on a streamed JavaScript swap. Later catalogue/AI/gold requirements stay unpassed. Record actual device/environment, screenshots, failed checks/corrections and unperformed tests in PROJECT_STATE.

### Phase 04 catalogue checks

Verify the user's reduced11-image decision, distinct local assets and permanent prompt/hash/provenance manifest; only image-backed PUBLISHED entries can appear. Keep14 draft briefs hidden, with404 detail responses; category gaps must not claim shop unavailability. Assert SAMPLE design/stock and independent AI_GENERATED media, null unsourced price/mass/time, and no actual purity/manufacturability guarantee.

Test zero/one/several stock units independently from manufacture; origin matching, review-required/custom and unsupported projections; mixed purity options so an18K stock row does not make22K in-stock. Search by ID/name/multiple keywords and combine every supported facet. Invalid/duplicate/inconsistent query values, unsupported budget/weight/sort and stale/query-bound cursor errors must be explicit. Test stable bounded pagination, sort tie-breaking, direct URLs and browser Back/Forward. A separate in-memory10k synthetic fixture is not advertised inventory or production DB/load evidence.

At320/375/390/768/1024/1440: decode media, no document overflow, meaningful screenshot review, native category/navigation/footer links. Test mobile filter focus wrap/Escape/apply/clear/return, public search, read-only design preview, empty categories/search, genuine pending skeleton, API fault/retry with retained query, aborted/late response race, image404 fallback, invalid deep-link recovery and route-boundary retry. Test reduced motion and automated WCAG2/2.1 A/AA on page/drawer/preview without suppressing rules. No-JS content must be visibly rendered with working native forms/links, not hidden streamed content. After scrolling results into view at390/1440, assert filter/results geometry cannot overlap; state screenshots must show the actual tested state rather than the offscreen hero. Product/quote/admin routes stay unbuilt.

Run TypeScript/strict lint/build and all Phase 02/03 regressions, adjusting only the now-real catalogue route expectations/navigation label/optimized hero failure URL. Record real local catalogue transfer/JS/CLS/LCP and bounded DOM. Profile homepage before/after with attribution to hero resource versus render delay; retain the old3.08s miss and disclose any new miss, startup long tasks and absent real-device/throttled/field evidence. Passing tests alone do not certify performance, accessibility, final art approval or provider functionality.

## 7. Archived Phase 01 review brief (retired)

The following original independent-review brief is retained for historical context. It is superseded by section 6 and is not an active Claude assignment.

Read the three root instructions, then PRD → UX → DESIGN → ARCHITECTURE → DATA_MODEL → API_CONTRACTS → AI_ARCHITECTURE → this plan. Recheck actual files/Git. Review only; do not scaffold or write application/migrations/seeds. Follow one-writer handoff and append your review to PROJECT_STATE.md. Produce findings with severity (BLOCKING/MAJOR/MINOR), exact file/section, consequence and concrete correction; distinguish missing owner decisions from contradictions.

Review product: all requested customer features versus deferred operations, no duplicate/empty routes, coherent made-to-order source and delivery promises. Review design: luxury hierarchy, six-scene sequence, asset feasibility, reduced motion, mobile/Urdu/contrast. Review architecture: guest privacy and CSRF design, non-bypass SQL role/context under pooling, Storage privilege isolation, idempotency, quotas, durable jobs/voice controls and deployment budget. Review data/API: source unions, ownership at every FK, snapshot immutability, async CHAT/image results and no order/loan mutations. Review acceptance: traceability, source labels and evidence that distinguishes real calls from fixtures.

Resolve or explicitly accept blocking decisions O-01–O-11 before their dependent phase; do not mark Phase 01 approved while material contradictions remain. Expected review outcome: findings plus recommendation READY_FOR_OWNER_SIGNOFF or NEEDS_REVISION, not a claim that runtime works. If accepted, hand back to Codex for a separately assigned Phase 02 design system/setup task. No independent review has occurred in this authoring task.
