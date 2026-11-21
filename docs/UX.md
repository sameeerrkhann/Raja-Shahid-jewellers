# Customer sitemap, journeys and interactions

## AI-01 route and journey update — 2026-11-19

/ai-atelier is now the AURIA workspace; homepage “Design with AURIA”, header “Meet AURIA” and catalogue navigation link there. Homepage motion/artwork and the internal design-preview concept remain preserved. Other unbuilt sitemap routes are still unbuilt.

Desktop: history, conversation and selected-design/draft columns. At <=900px, accessible Conversation / Design & draft / History switches show one pane. Text composer, streamed output, Stop, explicit Retry, timestamps, new conversations and server-restored history. Empty state suggestions populate the composer; they do not call the provider automatically. Initial curated SAMPLE cards are catalogue discovery, not AI recommendations.

Choose a card → selected public source details → save editable fictional draft → review snapshot → explicit checkbox and Confirm demo enquiry. Nothing is submitted by the model. Saved receipt states no real order/notification/delivery. Chat and drafting remain separate: missing provider access leaves discovery/draft available. Show error/unavailable states honestly; never manufacture a greeting as a live AI answer.

Language selection applies to newly created conversations; English/Urdu/Roman Urdu user prompts should be followed. Urdu rendering uses dir=auto and language tagging; native-speaker/accessibility review still required. Minimal safe Markdown excludes HTML and active arbitrary links. Voice/upload/image controls are absent, not disabled controls implying a working integration. Actual responsive/test evidence is tracked in PROJECT_STATE.

## Earlier baseline and future proposals (retained; active amendment above takes precedence)

Status: Phase 01 definition with Phase 04 catalogue routing update, Codex internal review2026-11-17. Owns routes and behavior. [PRD.md](PRD.md) owns business rules; [DESIGN.md](DESIGN.md) owns visual/motion treatment; [API_CONTRACTS.md](API_CONTRACTS.md) owns transport. Implemented route families: `/`, `/designs`, `/collections`, `/collections/[slug]` (four curated slugs). Internal `/design-preview` is separate. Product detail and all other planned routes remain unbuilt; the inventory below retains their future contracts, not a claim that they work.

## 1. Global navigation and route rules

Desktop: wordmark/home, Collections, Design Vault, Bridal, Made to Order, AURIA/AI Atelier, Gold Services menu; secondary story/contact links, search and wishlist. Mobile: compact header with menu, search and wishlist; accessible drawer with equivalent links. AURIA opens an accessible panel from every page and expands to `/ai-atelier` using the same conversation. No floating control covers form submit buttons or safe-area navigation.

Footer contains store information only when approved, policy/FAQ links, consultation and an explicit demo context. A global sample-catalogue indication remains visible wherever sample stock or amounts are shown; each affected item/media keeps its own label. Do not plaster implementation details into normal product copy.

Static content is server-rendered where practical; core navigation/catalogue information remains readable if enhancement fails. Modal close restores focus; Escape closes the top dismissible layer; background is inert while modal. Browser Back restores filters and scroll where possible; direct links work without first visiting home. Every route has meaningful title, heading, canonical URL and not-found handling. Private pages use noindex and no-store. Preview deployments use noindex globally; only approved public content may later be indexable.

## 2. Complete page inventory

| Route | Purpose / primary actions | Inputs, source and exceptional states |
|---|---|---|
| `/` | Six-scene story; discover collections, vault, atelier and consultation | Approved or labelled sample imagery; no animation gate; missing media has designed poster |
| `/collections` | Editorial collection index | Published collection records; empty catalogue state |
| `/collections/[slug]` | Collection story and filtered designs | Unknown/unpublished slug 404; reuses vault cards/query behavior |
| `/designs` | Design Vault; query/filter/sort/bounded cursor pages | URL state described below; empty/error and retry; published sample/approved records only |
| `/designs/[slug]` | Product gallery, source/status, specifications, options, wishlist, similar items and quote CTA | Valid variant selection; unknown values explained; stale stock never promised; zoom has controls and keyboard support |
| `/bridal` | Curated bridal landing with relevant collections/designs | Content-curated selection; CTA to filtered vault; no duplicate product records |
| `/new-arrivals` | New curated designs | Publication date, not invented stock-arrival dates; same card component |
| `/made-to-order` | Process explanation and guided quote form | Optional `design`, `variant`, `concept`, `revision` query IDs; owned/valid sources only; not arbitrary external URLs |
| `/ai-atelier` | Unified chat/voice and concept workspace | Optional owned `conversation`, `concept`, `revision` IDs; another guest's ID unavailable; provider capability states |
| `/wishlist` | Saved guest designs and selected concept revisions; remove/open/request quote | Local optimistic updates reconcile with server; empty/expired session recovery explanation |
| `/quotes/[reference]` | Owned saved enquiry summary and source snapshot | Same-browser guest cookie required; never show private data by reference alone; no public sharing/indexing |
| `/gold-rates` | Source/time/purity/unit rate board and calculator entry | Feed mode, locality/currency, freshness and unknown feed states always shown |
| `/gold-value` | Indicative metal-content value; valuation enquiry entry | Positive mass, karat and explicit rate snapshot; sample result remains sample |
| `/gold-financing` | Owner-approved educational copy and consultation request | Enquiry only; no approval, eligibility score, loan amount or repayment simulation |
| `/consultation` | Appointment request form | Preferred date/time zone/channel; saved request not slot reservation |
| `/order-status` | Fixed example tracking lookup | Only advertised synthetic reference `DEMO-ORDER-001`; clearly “Sample order”; no real customer/order search |
| `/our-story` | Heritage and craftsmanship editorial page | Unconfirmed history remains draft/neutral copy, not fabricated milestones |
| `/gallery` | Curated imagery with captions and lightbox | Image provenance; no private upload feed |
| `/contact` | Approved location/hours/contact and general enquiry | Missing shop details shown as pending, not a false address/map; WhatsApp action only if approved |
| `/faqs` | Accessible topic navigation and expandable questions | Versioned owner-reviewed answers; unknown policies escalate to consultation |
| `/policies` | Policy index | Links to the three planned policy routes below; demo wording pending owner approval |
| `/policies/privacy` | Data purpose, retention, permissions and deletion contact | Version referenced in consent receipts; no claim of legal review |
| `/policies/terms` | Demo, concept, quote and sample-data limitations | No invented business terms |
| `/policies/returns` | Owner-approved returns/manufacturing explanation | Pending policy explicitly identified; no implied statutory/contractual advice |

No `/admin`, staff dashboard, login/account, checkout, payment, actual order management or lending routes. Framework loading/error/not-found views are route states, not additional business pages. Assets and `/api/*` are not customer pages; the API inventory is complete in its owning document.

Vault query contract: `q`, `category`, `subcategory`, `collection`, `status`, `karat`, `style`, `occasion`, `sort`, `cursor`, optional `limit` (default12/max48). Empty/default values are omitted; sort is `featured` or `newest`. Latest Phase 04 assignment adds CUSTOM_DESIGN/custom-enquiry and UNAVAILABLE to IN_STOCK/MADE_TO_ORDER projections. Only curated public SAMPLE records may illustrate these states; private AI concepts are not auto-published. Each card labels sample availability and AI media separately. Unavailable needs unsupported manufacture and no eligible stock; none of the current public fixtures is asserted unsupported.

All selected facets intersect. Purity and stock status must match the same eligible variant, not different options. Unknown budget/weight filters are omitted and rejected by the API. Changing filters resets cursor; search is debounced350ms and supports explicit submit. Back/Forward and direct URLs restore query state. Mobile drawer has apply/clear/applied count/focus return. The Phase 04 implementation deliberately uses bounded next/previous cursor pages rather than the earlier speculative append-only load-more: default12 cards, max48 per validated page, no unbounded DOM or whole-catalogue client payload. Page links retain filters/sort; cursor is bound to query/sort/dataset. Results/category counts refer to this sample dataset (or the current collection), not actual inventory. Collection path fixes its collection even when other facets are cleared.

## 3. Signature journeys and evidence boundaries

| Journey | Ordered interactions | Success / failure |
|---|---|---|
| J-A Luxury discovery | Home scenes → collection → card → product detail → options | Correct source/status and working link; reduced-motion user reaches same destinations without pinning |
| J-B Made to order | Vault search → MADE_TO_ORDER item → valid variant → quote draft → review/consent → submit → owned confirmation → optional sample tracking | Durable reference and immutable source; failed save preserves draft; sample timeline is never implied to be this enquiry |
| J-C Text concept | AURIA prompt → explicit Generate action/cost notice → queued real job → revision v1 → edit selected revision → v2 → compare → save → quote | Distinct actual stored outputs and parent linkage; blocked/failed job retains previous revision; no fake completion |
| J-D Reference concept | Permission notice → upload → validation → vision attributes → similar seeded items → request edit → real image job → save/quote | Matching basis shown; unknown purity/weight not inferred; invalid/private foreign upload rejected |
| J-E Voice | Explain AI speech and mic use → user starts → permission → connection → speak → interrupt → product cards → mute/end → type in same conversation | Actual speech exchange, no residual mic track, known cards; denied mic offers typed input without losing context |
| J-F Gold services | Rate board → source/freshness → mass/karat/unit → indicative value → consultation form → saved reference | Formula uses displayed snapshot and exclusions; stale/unavailable never silently replaced with live-looking sample |

## 4. Page interactions and shared states

Product detail shows gallery navigation, enlarged image dialog, option controls and a sticky mobile CTA only when it does not cover content. IN_STOCK CTA is “Enquire about this piece”; MADE_TO_ORDER is “Request a quotation”; CUSTOM_DESIGN appears in atelier and is “Request workshop review.” None reserves stock. Changing options updates the selected variant and summary; incompatible options are disabled with explanation. Unknown weights/prices stay absent or “Confirmed by the workshop,” not zero. A saved wishlist state is persistent after reload while the session is valid; failure rolls back optimistic success.

Forms share labelled required fields, accessible inline errors, an error summary focused after invalid submission, pending button state, idempotent retry and a review/confirmation step. Preserve non-sensitive draft selections on navigation; keep contact fields in memory, not query strings or long-lived local storage. Expired session asks user to start again; never silently attach an old private resource to a new guest. All date pickers allow keyboard entry. Consultation dates are interpreted in Asia/Karachi, stored with zone, and have no claim of available appointment slots.

Only non-sensitive receipt references and form-step state may be retained in sessionStorage for inline appointment/enquiry recovery after reload. Rehydrate private details through the owned GET endpoint, never by persisting contact fields in browser storage; an expired cookie makes the reference unusable.

AURIA panel has transcript, message input, language preference, attach image, voice start/mute/end and links to full atelier. Generate/edit are explicit actions; opening the panel never starts a paid call or microphone. Concept cards show version number, parent, creation time, provenance and selected-for-quote state. Cancel suppresses later UI completion but warns that an already-started generation may still consume provider budget. Do not use invented percentage progress. Saved image links require an owned resource and a fresh authorized URL.

Gold-value form accepts gross mass and optional non-gold mass in grams, validates non-gold <= gross, and uses purity/24 against the displayed 24K base-rate-per-gram snapshot. If only gross mass is known, label the result an illustrative upper metal-content estimate excluding stones, labour, taxes and assay deductions. Unit conversion must use an approved, versioned convention; tola is disabled until that convention exists. Recalculate visibly if the selected snapshot changes; never change a submitted enquiry snapshot silently.

Every data section supports: initial skeleton with reserved size; loaded content; true empty state with clear filters; recoverable error with retry; integration unavailable with next useful action; offline warning while retaining the draft; expired session explanation. Capability faults are local: failed voice still permits typed chat; failed AI does not prevent catalogue browsing or quotes from known designs. Explicit cached gold data stays timestamped and stale.

## 5. Accessibility, language and responsive behavior

Targets: keyboard-complete navigation/forms/gallery; 44px touch targets; visible focus; semantic headings; associated errors; non-color status labels; WCAG AA contrast for text and controls. At 320px there is no page-level horizontal overflow. At 200% text zoom and 400% browser zoom content reflows without clipping essential actions. Live regions announce completed actions and meaningful status changes, not every token or animation frame.

English UI first; AURIA evaluates English, Urdu and Roman Urdu without claiming full site localization. Urdu message blocks use appropriate `lang`/`dir` without reversing mixed product IDs/numbers. Offer typed clarification if speech recognition or meaning is uncertain. Do not infer a speech transcript is perfectly accurate. User language preference is carried across modalities.

## 6. Review questions

Confirm sitemap size and primary navigation, quote confirmation privacy, ownership loss messaging, the sample tracking boundary, and whether an appointment/general enquiry reference needs its own page. Proposed answer: show appointment/general reference inline and keep confirmation pages for quote requests only; private appointment/enquiry retrieval stays API-backed for reload within the active form session. No extra empty routes should be invented during setup.

## 7. Phase 02 internal preview routing

`/design-preview` is an additional internal, noindex/nofollow visual review route, not a25th customer journey or an admin page. Phase 03 now supplies `/`; the temporary redirect is removed. Unbuilt customer routes remain404 with the designed not-found view, not empty stubs.

Preview navigation links only to existing sections (selection, collections, AURIA and design language). Search filters the small editorial study set locally. Image/collection actions open a real reference-study dialog. AURIA's planned composer/mic capabilities are visibly non-interactive; its concept-details dialog works. No stock, quote, persistent wishlist, AI output or gold-rate functionality is implied by these component studies. Actual navigation destinations will be switched deliberately as later routes are implemented.

## 8. Phase 03 homepage interactions

Homepage chapters are `/#entrance`, `/#craft`, `/#bridal`, `/#vault`, `/#auria`, `/#gold`; `/#top` is the top review/motion strip. Phase 04 makes the shared Design Vault link point to `/designs`, retaining the gallery chapter as “Category directions.” Catalogue routes use vault/collection/story/AURIA navigation; the original four preview links/search remain on `/design-preview`. Footer retains a real Design preview client link; wordmark returns home. Public-page search now submits to the actual sample Design Vault; only the internal preview searches three reference studies.

The six homepage vault cards remain editorial directions, not catalogue records. Their explanations now link to actual filtered `/designs` browsing and retain reference-study links; vector cards still say illustration. Desktop gallery controls, keyboard visibility, mobile/native and reduced-motion behavior remain. AURIA/visit/enquiry CTAs still explain unavailability, not a fake form/composer/success receipt. Static gold remains arbitrary/illustrative, not a live source or offer.

With JavaScript unavailable, semantic story, photographs and native chapter links remain. Home feature controls are removed in the no-script alternative and no pinning is attempted. Failed media gets a designed text composition; unavailable imagery never establishes inventory or AI output. No owner contact/address/booking availability is invented.
