# AURIA — unified chat, vision, images and voice

## Active AI-01 text foundation — 2026-11-19

This section supersedes the older OpenAI-first proposal for the private demo. Only Gemini text is implemented. Images (including analysis/upload), generation/editing and connected voice are postponed; their TypeScript capability interfaces are boundaries, not working features.

- Provider-neutral `ChatProvider.stream` and bounded orchestrator; Gemini adapter uses pinned `@google/genai@3.6.0`. Model allowlist: `gemini-3.1-flash-lite` only. No automatic fallback, paid SDK path, search grounding, batch jobs or account/billing changes.
- Gates: server-only GEMINI_API_KEY, AI_CHAT_ENABLED=true, GEMINI_FREE_TIER_CONFIRMED=true. Operator must verify Free tier/billing disabled in AI Studio. Configuration cannot independently verify billing; disable chat if that status changes. READY means configured, not a successful live call.
- Local cap5 provider requests/minute, default20/rolling24h (AI_DAILY_REQUEST_LIMIT, max100). Every tool round and failed attempt counts. SDK attempts1; no automatic retries. Up to4 rounds/12 tool calls,6 cards/result,1600 output tokens/request;40s provider and90s whole-turn timeout.
- Context: latest12 eligible messages, max16,000 characters; selected design and ordered recent IDs plus draft summary. No full catalogue dump. Exact source DTOs become cards; model text is escaped and minimally formatted, not executable HTML.
- Tools: searchJewellery, getProductDetails, getDesignAvailability, getCategories, getAvailablePurities, getRelatedDesigns, getStorePolicies, createQuoteDraft, getQuoteDraft, getOrderStatus. Zod strict schemas reject unrecognized arguments/owner spoofing. Server-derived owner scopes every private tool. Draft creation never submits.
- Policies require unknown prices/weights/timings to remain unknown; budget/lightweight requests are preferences, not verified matches. All11 records and availability remain SAMPLE; images are AI concepts. Production shop facts remain unapproved.
- Direct NDJSON streaming with persistent completion/error/stop, replay-safe request IDs and explicit Retry. No durable streaming worker or replay of lost individual tokens. Interrupted streams remain incomplete. No hidden production mock mode.
- Free-tier prompts may be used to improve Google products: UI disclosure and fictional data only. Windows TLS diagnostic required `node --use-system-ca`; certificate verification was never disabled.
- Actual test evidence, success/blocker status and exact AI-02 handoff are in PROJECT_STATE.md.

Official sources checked2026-11-19: [model/function support](https://aistudio.google.com/docs/models/gemini-3.1-flash-lite), [free-tier pricing/data treatment](https://aistudio.google.com/docs/pricing#gemini-3.1-flash-lite), [project-specific quotas](https://aistudio.google.com/docs/rate-limits), [supported SDK](https://aistudio.google.com/docs/libraries), [function calling](https://aistudio.google.com/docs/function-calling). Numeric Google quotas must be read in the user's AI Studio project; local caps are not provider guarantees.

## Earlier baseline and future proposals (retained; active amendment above takes precedence)

Status: Phase 01 integration proposal, 2026-11-17. No real call, model access, speech quality, cost or connected service has been verified. OpenAI is the proposed provider, subject to O-04. [API_CONTRACTS.md](API_CONTRACTS.md) owns our endpoints; [ARCHITECTURE.md](ARCHITECTURE.md) owns runtime/secrets/quotas; [DATA_MODEL.md](DATA_MODEL.md) owns persistence.

## 1. One concierge, several capabilities

AURIA has one application conversation ID, language preference, approved catalogue tools and canonical stored messages. Typed and voice interfaces are views of this state; image jobs append outcomes to the same conversation. A selected concept/revision is explicit context, not assumed to be “the last image” in any browser tab. Provider response/session IDs are private adapter metadata and never replace application ownership.

Proposed adapters: `ChatProvider.respond`, `VisionProvider.analyze`, `ImageProvider.generate/edit`, `VoiceProvider.connect/control/end`, `CatalogueRepository.search/get`, `ConceptRepository.saveRevision`, `QuoteDraftService.prepare`. These are conceptual boundaries, not code. Use supported models selected by configured capability; do not assume a single model supports chat, image output and audio or mix protocol event formats.

Official documentation supports conversation-based image generation/editing and server-executed function tools. Our storage/versioning/ownership design is an application recommendation built on those capabilities, not a provider guarantee. [Image generation](https://developers.openai.com/api/docs/guides/image-generation), [Function calling](https://developers.openai.com/api/docs/guides/function-calling)

## 2. Grounded typed conversation

1. Session owns the conversation; API validates expectedVersion, acquires a single active-turn reservation, records the user turn/operation and reserves cost before returning 202. Worker invokes the configured model and appends safe incremental events. Reconnect reads events/history without starting another paid turn.
2. Build context from approved concierge instructions, language, recent completed messages, an explicitly marked summary, selected owned revision and catalogue/tool data. Summaries cannot convert guesses into facts. Do not send contact details or full unneeded transcripts to the model.
3. Tool registry is allowlisted and schema-validated. Tools receive server-derived session context, not model-supplied owner IDs. Treat model arguments and uploaded-image text as untrusted input. Bound tool rounds (proposed max4), results (max6 cards) and text length. No free-form SQL, arbitrary browsing/URL fetch, staff data or secret inspection.
4. Retrieve catalogue records before factual claims. Validate returned card IDs against the repository; cards are rendered from trusted DTOs, never model-invented HTML/prices. Persist completed assistant text, tool evidence summary and operation ID. Failed or interrupted responses remain explicitly incomplete, not a successful stored answer.
5. Re-read changed stock/policy/rate context when relevant. If facts are missing, say they need workshop confirmation and offer a quote/consultation draft. AI may suggest a draft; final contact/consent/submission is a deliberate customer action in the normal form.

| Tool intent | Permitted output | Boundary |
|---|---|---|
| search_designs | Published matching IDs/cards with origin/status and basis | Match actual records; at most6 cards; no arbitrary stock query |
| get_design | Public detail/valid variants | Null facts stay unknown |
| get_gold_snapshot | Approved latest snapshot, source/mode/freshness | Never manufacture a rate or silently use sample as live |
| get_policy | Versioned approved policy or pending explanation | No invented promises/financing rules |
| prepare_quote_draft | Allowed source/option summary and form destination | Cannot save a contact enquiry or accept a quote without customer review/consent |
| propose_image_action | Prompt/reference/revision draft for explicit Generate/Edit action | No hidden paid image job triggered by a model suggestion |

Image/voice/text tools share the same catalogue service and authorization logic. Nothing grants access to another conversation because the customer says they own it. Prompt injection in descriptions/images is content, not instructions. Never claim exact weight, purity, gem authenticity, price, delivery or workshop acceptance from pixels.

## 3. Vision and similar-design retrieval

Reference notice requires permission to use the image and explains processing/storage. API creates a quarantined owned object; finalization validates/re-encodes it before the provider can read it. Vision job extracts visible attributes such as category, motif, apparent metal tone, setting style and silhouette, plus uncertainties. Metal tone is not karat; a depicted stone is not an authenticated gemstone.

Initial similarity maps those attributes and curated synonyms into published catalogue filters and weighted tag matching. Return `matchBasis: ATTRIBUTE_MATCH` and explain “similar style” instead of asserting pixel/identity matching. Limit to available seeded records; zero matches is a valid result with broader categories. For a real visual-embedding index later, define model/dimension/version, consent, index refresh, evaluation and provider cost before introducing vector dependencies. That enhancement is optional, while real vision analysis is required by R-06.

## 4. Generation, editing and durable versions

Generation requires an explicit user action with prompt, selected references, visible limits and the AI-concept warning. Worker passes the approved prompt/reference bytes to a currently supported image-capable interface. Save the original permitted references separately; never overwrite them. Output screening, decoded-image validation and private storage must succeed before publishing a revision event.

An edit carries conceptId and parentRevisionId and supplies that exact stored parent image plus requested changes to the provider. Do not fake editing by showing a different seeded image or sending only the old text prompt. Supported conversational edit context may also be retained privately, but application versions remain portable images and metadata. The API's documented image/context options support this direction; exact request/model compatibility is a pre-implementation check. [Image generation and multi-turn edits](https://developers.openai.com/api/docs/guides/image-generation)

Commit media record, immutable revision with parent, prompt summary/model/operation metadata and job result in a transaction after upload verification. Atomic revision numbering prevents duplicate v2 under concurrent edits; branching is allowed and parent-labelled. A later selected revision pointer changes the workspace only; any submitted quote keeps its prior revision snapshot.

Job UI states map to actual QUEUED/PROCESSING/SUCCEEDED/FAILED/CANCEL_REQUESTED/CANCELLED/RECONCILIATION_REQUIRED. No random progress counters. If provider completed but storage failed, preserve its request metadata and reconcile; do not silently bill again. Show safe failure plus retry only when consequences are understood. Provider refusal is not a successful design. Each displayed image says “AI concept — workshop review required”; no CAD/weight/manufacturability claims.

## 5. Realtime voice plan

Baseline proposal is Realtime GA speech-to-speech over WebRTC, using server-mediated session/SDP establishment and a server sideband for private tool execution/control. OpenAI documents browser WebRTC and backend session control; this proposal chooses a backend-mediated connection so the application obtains the remote call identity directly. An ephemeral-client-secret approach is an alternative, not a second simultaneous implementation. [WebRTC guide](https://developers.openai.com/api/docs/guides/voice-webrtc?voice-api=realtime), [Server-side controls](https://developers.openai.com/api/docs/guides/voice-server-controls)

Do not mix Realtime GA, legacy beta and GPT-Live event/session schemas. The current official getting-started page distinguishes these routes; verify the chosen model/protocol again in Phase 08. This phase selects no model ID and claims no account availability. [Realtime API guide](https://developers.openai.com/api/docs/guides/realtime)

Connection sequence:

1. Explain AI-generated speech, mic use, transcript handling and session limit. Start only after a user gesture. Request mic permission; denial returns to typed input without provider session creation.
2. Browser creates a WebRTC offer and sends it with owned conversation/version to the application. Server reserves budget/turn and establishes the remote call. Browser receives only the application voiceSessionId, SDP answer and deadline. No standard provider key is sent to the client.
3. Server associates the provider-returned call ID with that guest/conversation, attaches the control connection and supplies approved history, language and tool definitions. Worker owns tool execution; browser captions/cards are untrusted display events until reconciled with stored application events. One tool call ID executes once even if browser/control channels both observe it.
4. Incoming speech yields captions where supported and meaningful completed transcript segments in canonical history. Retrieval yields the same trusted cards as typing. Do not store raw audio. Allow natural interruption and clear queued playback; mark interrupted output so it is not summarized as fully heard.
5. Mute changes the actual local media track, not just an icon. End stops local tracks/playback immediately and asks backend to terminate the remote session. Server tracks finalization/usage separately; tab close/network loss triggers deadline enforcement. A “disconnected” local UI is not proof the provider stopped billing.
6. Switch to typing after ending/reconciling the voice turn; preserve conversation and selected products. Reconnect creates a new controlled voice session with approved history rather than assuming the old session survived. Reject simultaneous typed/voice turns until serialization is resolved.

The proposed 300-second cumulative guest allowance requires authoritative backend enforcement, not a browser timer or token expiry alone. Phase 08 must prove provider termination/usage reconciliation in the selected runtime, including a hostile/abandoned client. If hard termination/control cannot be verified, keep voice disabled and record O-10; do not claim a spending cap from UI behavior. Provider project budgets and alerts are additional controls, not assumed real-time kill switches.

## 6. Cost, moderation and failure boundaries

Paid features default off until credentials, budget, capability smoke test and operator approval exist. Reserve estimated maximum operation cost atomically; finalize against actual usage where supplied, keeping unknown outcomes reserved/reconciling. Proposed maximums: 40 typed turns, 6 total image generation/edit jobs, one concurrent image job, 300 cumulative voice seconds per guest session, and an explicit site daily budget. Multiple guests can be created, so shared budget/IP controls still matter. Vision uses the same metered provider budget; its exact per-session allowance must be finalized with model costs before enabling it.

Reject unsupported content/oversize references before paid processing where possible. Provider refusals and unavailable quota are surfaced calmly; retry transient failures only with bounded backoff and known outcome. No automatic retry of ambiguous paid completions. Concept/job cancellation never promises a refund. Do not describe handwritten reference details as instructions or expose system prompts/customer data in model-visible tools.

The AI can be helpful without financial promises: explain catalogue choices, ask clarifying style/size questions and prepare a consultation draft. It cannot approve a loan, certify gold, promise a delivery date or confirm a manufacturing technique. Unsupported claims are evaluated in the test set, not assumed prevented by a single prompt.

## 7. Integration evidence needed before sign-off

Real chat: redacted request/operation ID plus a two-turn grounded answer and correct cards. Vision: permitted input, actual attribute output/uncertainty and seeded matches. Images: actual v1 output, real edit v2 using v1, parent linkage and stable private asset retrieval after reload. Voice: actual microphone/spoken exchange, interrupt/mute/end, backend stop evidence and English/Urdu/Roman Urdu task results. Cost: redacted usage/reservation reconciliation and enforced limits. Record capability evidence per environment; sample fixtures/mock providers only test UI and do not satisfy these live checks.

Official documentation was consulted during Phase 01 on the local date above; sources establish capabilities, not compatibility of an unchosen account/model/runtime. Recheck documentation and supported models at implementation time; no prices, account entitlements or production safety guarantees are asserted here.
