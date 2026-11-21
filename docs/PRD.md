# Customer-facing demo — product requirements

## Active AI-01 scope amendment — 2026-11-19

User authorizes a real one-tester private text concierge using eligible free-tier Gemini only; no paid billing/calls or automatic fallback. This supersedes the earlier OpenAI-first implementation order, not the broader future product vision. Catalogue stays the existing11 clearly labelled SAMPLE records with unknown price/weight/timing facts. No competing catalogue or admin portal.

Required now: grounded streaming text, owned persistent conversations, selected-design/follow-up context, multilingual responses, safe errors/stop/retry, typed catalogue tools and fictional persistent quote drafts with explicit approval before a demo enquiry. No real customer details, real orders, reservations or notifications. Accurate business policies still require owner input.

Sequence: AI-01 foundation → AI-02 grounding/context/comparison evaluation → AI-03 full order/quotation workflows → unified voice after those work → image analysis/generation/editing last. Each needs separate authorization. AI-01 does not complete Phase05 product pages or the entire older Phase06 acceptance scope. Implementation details live in the existing architecture/API/data/UX documents; actual results and blockers in PROJECT_STATE.

## Earlier baseline and future proposals (retained; active amendment above takes precedence)

Status: Phase 01 definition internally reviewed by Codex on 2026-11-17 (not an independent review). The user separately authorized Phases 02–04 and explicitly accepted finishing Phase 04 with 11 available original images after the built-in generation connection failed. This supersedes the earlier seed-count target for this demo, not final shop-data or manufacturing approval. Unresolved business/provider decisions remain gated to dependent phases. Scope authority and actual implementation status: [PROJECT_STATE.md](../PROJECT_STATE.md). Requirements below are targets, not verified behavior.

## 1. Document ownership and reading order

This document owns product scope, requirement IDs, business workflow and open decisions. Other documents own their detail; change a rule in its owning document and reconcile its consumers rather than maintaining competing specifications.

| Document | Canonical responsibility |
|---|---|
| [UX.md](UX.md) | Complete customer route inventory, navigation, journeys and page interaction states |
| [DESIGN.md](DESIGN.md) | Visual direction, component treatment, cinematic storyboard and motion fallbacks |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Application boundaries, configuration, security, persistence and deployment proposals |
| [DATA_MODEL.md](DATA_MODEL.md) | Entities, relationships, invariants, catalogue and demo seed structure |
| [API_CONTRACTS.md](API_CONTRACTS.md) | Public endpoint inputs/outputs, validation, authorization and errors |
| [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md) | Unified AURIA orchestration, retrieval, images, voice and cost controls |
| [ACCEPTANCE.md](ACCEPTANCE.md) | Requirement traceability, verification cases, release gates and active internal review protocol; original independent-review brief archived |

The root state remains the current-status/ownership ledger. Its early candidate routes, entities and environment names are historical planning inputs; this reviewed document set is intended to become the detailed contract after approval. Neither drafts nor a later successful demo establish actual inventory, manufacturing capability or financial approval.

## 2. Outcome, audience and success

Help a customer discover jewellery, understand whether an item is sample in-stock, a sample made-to-order design or an unreviewed custom concept, and submit a coherent enquiry. Give the owner a premium showcase of connected customer journeys rather than isolated screens.

Primary audiences: bridal shoppers comparing coordinated sets; customers seeking a ring, bangle or everyday piece; customers refining a permitted reference image; Urdu/English speakers seeking concierge help; visitors asking about gold valuation or a financing consultation. No staff persona or staff interface is part of this demo.

Success is demonstrated by the six journeys in UX, persisted owned enquiries/concepts, verified real AI responses where enabled, clear source labels and usable mobile/keyboard alternatives. No conversion uplift, guaranteed response time, valuation accuracy or business revenue is promised. Observe only approved, consented analytics; analytics installation is not a demo prerequisite.

## 3. Delivery classification

Every requirement below is required for the intended interactive showcase unless explicitly optional. An unavailable integration is an honest intermediate state, not evidence that its requirement has passed. A reduced showcase may be presented only with its omissions recorded; real chat/image/voice acceptance cannot be replaced with prerecorded responses.

| ID | Interactive demo requirement | Real versus sample boundary | Deferred production scope |
|---|---|---|---|
| R-01 | Six-scene luxury homepage; accessible responsive header/footer; story, collections and contact pages | Imagery credited/labelled by provenance; brand strings provisional | Final brand campaign, licensed media production, CMS |
| R-02 | Design Vault, categories, query/filters/sort, pagination, detail/gallery/zoom, shareable URLs | Target 80 curated sample designs, adjusted to defensible assets; never advertise sample counts as real stock | Bulk supplier import, enterprise catalogue operations |
| R-03 | Distinct `IN_STOCK`, `MADE_TO_ORDER`, `CUSTOM_DESIGN` views; valid options and approval limitations | Sample status always marked; workshop approval only from approved records | Live stock reservation, POS, ERP, manufacturing scheduling |
| R-04 | Custom/made-to-order draft, validation, durable submission, reference and owned confirmation | Real software persistence of a demo enquiry; no shop acceptance inferred | Binding quotation approval, payment, checkout and actual order fulfilment |
| R-05 | AURIA real multi-turn typed chat; catalogue-grounded cards and explicit unknown handling | Provider call must be verified; catalogue answers disclose sample origin | Sales automation and staff-privileged assistant tools |
| R-06 | Permitted image upload, visual attribute analysis and grounded similar designs | Real vision; initial matching is attribute-based, labelled accordingly | Embedding/vector similarity if later justified; certified gemstone appraisal |
| R-07 | Real text-to-image and edits; immutable versions, compare/save and quote attachment | AI-generated concept label on every revision; no CAD, weight or manufacturability guarantee | CAD conversion, engineering validation, automated production |
| R-08 | Real mic-to-spoken-answer conversation, captions where available, interrupt/mute/end, typed continuation | Explicit mic consent; voice availability/language quality tested, never simulated as live | Telephony, call recording, call-centre routing |
| R-09 | Rate board, purity/unit selection, indicative metal-value calculation and stale/error states | Connected approved feed OR visibly labelled sample feed; source and timestamp mandatory | Guaranteed buy/sell quotes, assay, lending/credit decisions |
| R-10 | Valuation/financing consultation, appointment and general enquiries | Saved demo enquiries; appointment request is not a confirmed booking | Loan processing, collateral records, disbursement, repayments |
| R-11 | Guest wishlist; same-browser saved conversation/concepts; example order tracking | Guest persistence; tracking is fixed synthetic demonstration data | Customer accounts, cross-device recovery, actual order tracking |
| R-12 | Designed loading/empty/error/offline/permission states; keyboard and reduced-motion paths | No fake progress, social proof or delivery success | Full internationalization and personalization; Urdu conversation still required to be evaluated |
| R-13 | Scoped guest authorization, upload validation, quotas, consent and provenance | Synthetic test data first; no public exposure of private conversations or contact data | Production fraud programme, complete compliance operations, incident support |
| R-14 | Automated and manual verification, responsive/performance evidence and disclosed known issues | Results recorded per configured environment | Production SLA, scalability claims and unmeasured compliance certification |

Admin portal, inventory management UI, actual settlement and staff APIs are outside all demo phases. Public backend routes necessary for the above remain in scope. Optional enhancements: real 3D assets, notifications and visual embeddings; none should delay core journey completion.

## 4. Product rules

`dataOrigin` is `SAMPLE`, `SHOP_APPROVED`, `AI_GENERATED` or `CUSTOMER_UPLOAD`; it travels with the record and media. External `integrationMode` is `CONNECTED`, `SAMPLE` or `UNAVAILABLE`. They describe different things: a real database can persist sample enquiries, and a connected model can recommend a sample design. CONNECTED is an environment-specific evidence claim, never inferred from a key's presence. Freshness is separate from both.

Guest use is the demo default. Private records are accessible only in the owning browser session; a public reference is not an access credential. Losing the session means no automatic recovery in this version. Clear that limitation before relying on saved material. Viewing another guest's resource returns a non-enumerating unavailable/404 response.

Prices, masses, purity, availability, delivery and shop policies must be sourced. Unknown values remain null with a human-readable explanation; do not insert believable defaults. Store currency/unit with every value. Sample budgets are customer preferences, not product prices. Never ask for identity documents, bank details or collateral evidence in the demo.

## 5. Made-to-order, quotation and delivery workflow

1. Enter from a design/variant, selected concept revision or blank custom request. Preserve immutable source identifiers; a subsequent AI edit must not alter a submitted request.
2. Draft captures selected options, requested changes, quantity, optional budget in PKR, desired date and optional reference uploads. Desired date is a request only. Draft remains local until deliberate submission; avoid putting contact details in URLs or local persistence.
3. Contact step requests name, one valid contact channel (phone or email), preferred contact method, optional city and consent to enquiry processing. Marketing consent is separate, optional and unchecked. Show a summary and source/AI limitations before sending. Synthetic details are required in test fixtures.
4. Submission revalidates session ownership, design/variant relationship, upload readiness, option compatibility and source revision. Transactionally save the enquiry, source snapshot and consent version; return a reference after commit. Duplicate retry uses the same idempotency key.
5. Confirmation says “Demo enquiry saved — shop review required.” It does not claim delivery to WhatsApp/email. If notification is later integrated, its delivery result is separate. Failed save keeps the draft and offers retry; never show a reference before commit.
6. The demo creates only `SUBMITTED` quote requests. A public customer cannot set price, approval, manufacturing status or a later stage. Pre-seeded sample quote/order examples can illustrate review and delivery; they remain synthetic and disconnected from a new enquiry.

| State | Meaning and allowed transition | Demo behavior |
|---|---|---|
| DRAFT | Local draft; can edit or abandon; deliberate send creates SUBMITTED | Interactive |
| SUBMITTED | Saved request awaiting human review; future reviewer can move to UNDER_REVIEW or CLOSED | Interactive terminal state for new demo submissions |
| UNDER_REVIEW | Workshop evaluates design, options, feasibility and time | Synthetic example only |
| NEEDS_INFORMATION | Future reviewer asks a concrete question; answered request returns to UNDER_REVIEW | Synthetic example only |
| QUOTED | Shop-approved version with itemized amount/currency, expiry and terms | Synthetic example only; no customer acceptance/payment endpoint |
| DECLINED / CLOSED | Cannot fulfil or review ended; reason required for any future real transition | Synthetic example only |

Production acceptance of a binding quote, deposit, manufacturing start, QA, dispatch and delivery are deferred. A sample order timeline can show these steps, but no quote submission spawns a real order. Shop-confirmed lead-time policy needs an approval source/date, minimum/maximum range and calendar/business-day basis. Without it, show “Timing confirmed after workshop review.” The customer's desired date never becomes an estimated delivery date. Expired quote examples cannot be presented as valid offers.

## 6. Open decisions and dependencies

| ID | Owner / required decision | Proposed approach and gate |
|---|---|---|
| O-01 | Owner: official brand spelling, AURIA name and brand assets | Retain provisional strings centrally; confirm before final media/design sign-off |
| O-02 | Owner: contact, address, opening hours and permitted WhatsApp number | No invented details or active contact links until supplied |
| O-03 | Owner: catalogue, imagery rights, stock evidence and manufacturing/quotation policies | Curated samples labelled throughout; authenticate before R-02/R-03 real claims |
| O-04 | Neural Stack/owner: AI provider account, models, spending limit and data-processing approval | OpenAI proposed; choose supported models by verified capability and budget before Phases 06–08 |
| O-05 | Neural Stack: hosting, database/storage region/provider and secret custody | Next.js + PostgreSQL/Supabase Storage proposal; Codex technical review and owner infrastructure decision before provisioning |
| O-06 | Owner: gold-rate feed, local/spot definition, refresh/stale policy and conversion convention | Sample board allowed; provider evaluation required before any live label |
| O-07 | Owner: privacy/retention, real contact collection, upload permission and enquiry wording | Proposed retention in architecture; use synthetic details until approved |
| O-08 | Neural Stack: package manager and Git setup | Resolved locally in Phase 02: pnpm/exact versions/one lockfile/main initialized. Remote/hosting/CI still unassigned; no automatic commit or remote attachment. |
| O-09 | Owner/reviewer: delivery basis, quote expiry, appraisal/financing wording | No fabricated durations, charges, eligibility rules or lending promises |
| O-10 | Neural Stack/reviewer: worker hosting and realtime session enforcement | Verify durable image jobs and server-controlled voice tools/budget before claiming readiness |
| O-11 | Reviewer: responsive art direction and supported language quality | Review storyboard; test English, Urdu and Roman Urdu in intended devices |

These decisions can be documented as assumptions during definition. Missing access does not authorize simulated integration success. All proposed architecture choices are reviewable, not externally provisioned.

## 7. Phase boundary and approval

Phase 01 produced these eight planning documents. On 2026-11-17 the user replaced the Claude review workflow with Codex internal review and explicitly authorized Phase 02. That review is recorded in PROJECT_STATE.md; it is not independent validation or approval of unresolved provider/business assumptions. Frontend setup may proceed; later backend, privacy, imagery and shop-policy decisions remain gated to their dependent phases. Stop after each assigned phase. Phase 02 builds the internal visual foundation, not the full homepage, catalogue or integrations.
