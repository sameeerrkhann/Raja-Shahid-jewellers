# Customer demo API contracts

## Implemented AI-01 contract — 2026-11-19

The contracts below supersede the older202/worker chat proposal for this local text phase only. Node runtime, loopback Host allowlist, exact Origin for mutations, SameSite Strict HttpOnly guest cookie and X-CSRF-Token (except bootstrap). All responses private/no-store. Foreign-owned IDs return404; expired sessions401; validation422; oversize JSON413; concurrency409; unavailable provider503; quota429. Never return provider secrets/raw upstream errors.

| Method/path | Body / result |
|---|---|
| POST /api/ai/session | {} → csrfToken and capability; create/recover seven-day browser session |
| GET /api/ai/conversations | Owned summaries, capability and token usage metadata |
| POST /api/ai/conversations | {language: auto/en/ur/roman-ur} → conversation201 |
| GET /api/ai/conversations/:id | Owned full conversation, selected/recent IDs, messages and draft |
| POST /api/ai/conversations/:id/selection | {selectedDesignId: UUID or null, expectedVersion} → updated conversation |
| POST /api/ai/chat | {conversationId, expectedVersion, requestId: UUID, message} →200 application/x-ndjson |
| POST /api/ai/conversations/:id/stop | {} → stopped conversation; abort owned active response |
| POST /api/ai/conversations/:id/draft | {designId, variantId?, quantity?, requestedChanges?, budgetPKR?} → saved draft, NOT submitted |
| POST /api/ai/conversations/:id/submit | {expectedVersion: draft version, processingAccepted:true, fictionalDataConfirmed:true} → idempotent demo receipt |

Chat events: delta{text}, cards{cards}, draft{draft}, error{code,message,retryable}, done{conversation}. A streamed provider error can occur after HTTP200; consumers must inspect events and persisted message state. JSON bodies max16KiB; user text4000 chars;80 messages/30 conversations/session. Request UUID+payload hash replays a completed turn without new provider calls; conflicting reuse409. User Retry is a new request. Message status COMPLETE/STREAMING/STOPPED/FAILED. Canonical TypeScript shapes: src/types/auria.ts and validation.ts.

All catalogue tools reuse current public query/detail contracts, with max6 retrieved cards. No arbitrary SQL, owner input or private order lookup. Submission uses current variant validation, saved source snapshot and fictional contact, ends SUBMITTED, notification NOT_CONFIGURED. No actual order or delivery. API IDs do not authorize cross-session access. Full product/customization/order/image/voice endpoints below remain future proposals.

## Earlier baseline and future proposals (retained; active amendment above takes precedence)

Status: Phase 04 public catalogue subset implemented, 2026-11-17; other endpoints below remain proposals. Five read-only routes exist: GET designs/list, designs/[id], categories, collections/list, collections/[slug]. They use an immutable local SAMPLE repository, not a configured database or provider. Actual checks are recorded in PROJECT_STATE. These are application contracts, not provider APIs. [DATA_MODEL.md](DATA_MODEL.md) owns data; [PRD.md](PRD.md) owns business rules; [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md) owns future provider orchestration.

## 1. Common protocol and types

Base path `/api`; same-origin HTTPS; JSON UTF-8 except SSE and direct signed object upload. Dates are ISO 8601 UTC timestamps; date-only preferences are `YYYY-MM-DD` with explicit `timeZone: "Asia/Karachi"`. IDs are UUID strings unless a slug/reference is explicitly named. Reject unknown mutation fields. The server supplies ownership, origin, status, timestamps and prices; clients cannot set them.

Success: `{data: <typed result>, meta: {requestId: string}}`. Errors: `{error: {code: string, message: string, fieldErrors?: {field: string, message: string}[], retryable: boolean}, meta: {requestId: string}}`. List data is `{items: T[], nextCursor: string|null}`; catalogue adds `totalMatching` and `datasetOrigin`. Never expose a provider response body, stack, key, private storage key or another owner's identifier.

| Type | Required shape / constraints |
|---|---|
| Money | `{currency: "PKR", amountMinor: integer}`; nonnegative <=1,000,000,000,000; customer budget is a preference |
| Contact | `{name, preferredChannel, email?, phone?, city?}`; name 1–100 chars, city <=100; channel EMAIL/PHONE/WHATSAPP requires corresponding address; normalized email <=254 or international phone <=16 chars including `+`; at least one valid channel; optional fields omitted |
| Consent | `{processingAccepted: true, policyVersion: string, marketingOptIn: boolean}`; exact currently displayed version required; marketing false by default |
| Provenance | `dataOrigin: SAMPLE/SHOP_APPROVED/AI_GENERATED/CUSTOMER_UPLOAD`; context and media may differ; origin labels never inferred from integration mode |
| DesignCard | `{id, slug, title, categorySlug, thumbnail: MediaPublic|null, dataOrigin, displayStatus, availableVariantCount}`; fulfilment projection per data model |
| MediaPublic | `{id, url, alt, width, height, dataOrigin}`; only public catalogue derivatives; no private storage keys |
| Revision | `{id, conceptId, parentRevisionId: UUID|null, revisionNumber, mediaId, createdAt, dataOrigin: "AI_GENERATED", manufacturingReview: "REVIEW_REQUIRED"}`; private URL obtained separately |
| Job | `{id, operationId, kind, status, createdAt, updatedAt, result: object|null, errorCode: string|null}`; statuses QUEUED/PROCESSING/SUCCEEDED/FAILED/CANCEL_REQUESTED/CANCELLED/RECONCILIATION_REQUIRED |
| RateSnapshot | `{id, sourceLabel, locality, currency, baseKarat:24, ratePerGram: decimalString, observedAt, fetchedAt, integrationMode: CONNECTED/SAMPLE, freshness: FRESH/STALE, conversionVersion: string|null}`; positive rates; units not implicit |
| QuoteSource | `{kind:"DESIGN", designId, variantId}` OR `{kind:"CONCEPT", conceptRevisionId}` OR `{kind:"CUSTOM"}`; exactly one union branch |
| Receipt | `{reference, status, savedAt, dataOrigin:"SAMPLE", notificationStatus:"NOT_CONFIGURED"}`; no delivery/acceptance claim; actual origin can become SHOP_APPROVED only under a later approved real-data flow |

Limits below are proposed demo defaults for implementation review. JSON body max 64KiB, general message/changes 2,000 chars, chat prompt 4,000 chars, description 2,000 chars, catalogue `q` <=100 chars, IDs/references/slugs tightly validated. Rich HTML is not accepted. Public reads: 120/min/IP; private mutations: 30/min/session; session creation: 10/hour/IP; AI costs additionally governed by architecture quotas/site budget. Return 429 with Retry-After, never rely on IP limits alone. SSE has one active event stream per conversation per browser session, with replacement/reconnect support.

## 2. Session, authorization and idempotency

All owned resources require the HttpOnly guest cookie. Every mutation after session creation requires `X-CSRF-Token` and approved exact Origin; session creation still validates Origin and content type. Derive the recoverable CSRF value using a purpose-separated keyed function of the session bearer, store its hash, and never log either token; final cryptographic implementation must be reviewed. Missing/expired session returns 401 SESSION_EXPIRED. Foreign/missing private resources both return 404 NOT_FOUND; a known UUID or receipt reference is insufficient authority. No CORS wildcard with credentials.

`Idempotency-Key: <UUID>` is required on quote/enquiry/appointment creation, AI chat/image/voice session creation and upload-sign requests. Scope by session+route, store request hash and committed result/operation ID for >=24h. Same key/body replays the original result without another charge/write; same key/different body returns 409 IDEMPOTENCY_CONFLICT. Busy operations return the existing 202 operation, not duplicate work. Deletions and wishlist upserts are inherently idempotent. Session bootstrap is not a paid/idempotent operation; concurrency resolves to one valid cookie/session without leaking prior owners.

| Status | Error cases |
|---|---|
| 400 | Malformed JSON/query/cursor or wrong union discriminator |
| 401 | Missing/revoked/expired session |
| 403 | Origin/CSRF rejected, upload permission not accepted |
| 404 | Missing, unpublished or foreign-owned resource |
| 409 | Version conflict, incompatible source/variant, active conversation turn, idempotency mismatch, policy changed |
| 413 / 415 / 422 | Oversize / unsupported media type / validly parsed but invalid fields or rejected media |
| 429 | Rate/session/site budget limit; Retry-After where meaningful |
| 502 / 503 / 504 | Provider fault / unavailable dependency or disabled capability / timed-out operation; do not silently fabricate sample success |

## 3. Bootstrap and public reads

| Method + path | Request | Success data / edge behavior |
|---|---|---|
| `GET /api/capabilities` | None | `{chat, images, voice, gold, persistence}` with each `{available, integrationMode, lastVerifiedAt: timestamp|null}`; public modes only, never env values. False/unverified when no evidence. |
| `POST /api/session` | `{}`; approved Origin | 201 `{expiresAt, csrfToken}` plus cookie; existing valid session returns 200, same owner; do not silently replace valid state. |
| `GET /api/session` | Cookie | 200 `{expiresAt, csrfToken}` no-store; recover CSRF for same owner; no raw session ID/bearer returned. |
| `DELETE /api/session` | Cookie+CSRF; no body | 202 `{revoked:true, cleanupStatus:"QUEUED"}`; close active voice; clear cookie and revoke immediately; erasure handled under retention policy, not falsely claimed instant. |
| `GET /api/categories` | None | List `{id, slug, label, parentId:null|UUID, rank}`; published taxonomy only. |
| `GET /api/collections` | Optional `cursor`, `limit` 1–48 default 24 | List `{id, slug, title, description, hero:MediaPublic|null}`. |
| `GET /api/collections/[slug]` | Known published slug | Collection metadata; its designs retrieved via filtered designs query. |
| `GET /api/designs` | UX query keys; limit default12/max48 | DesignCard list, stable cursor, totalMatching and datasetOrigin. Category/subcategory consistency required; unsupported filters/sort rejected; reset cursor on changed query. Phase 04 adds previousCursor, pageNumber and datasetVersion. |
| `GET /api/designs/[id]` | Published UUID | Card fields + `{description, images:MediaPublic[], variants:[{id,code,karat:null|number,optionValues,massGrams:null|decimalString,indicativePrice:null|Money}], variantStatuses:[{variantId,displayStatus}], manufacturingReview, policyVersion:null|string}`; no private stock ledger. |
| `GET /api/gold-rates` | Optional currency PKR only | `{snapshot:RateSnapshot|null, integrationMode, unavailableReason:null|string}`. Live missing/stale feed never becomes SAMPLE automatically; current known snapshot can be returned stale. No visitor-controlled URL/provider refresh parameter. |
| `GET /api/demo-orders/[reference]` | Advertised synthetic reference only | `{reference, dataOrigin:"SAMPLE", status, timeline:[{stage,label,exampleDate:null|string}]}`; no actual PII or quote linkage. Unknown reference 404. |

Framework page lookup may resolve published slugs directly in the domain layer; no second slug API is needed. Full product detail pages remain Phase 05; Phase 04's GET design endpoint powers a real read-only preview dialog, not a quotation flow. Gold calculations remain a future shared decimal-domain proposal; there is no separate lending or valuation-offer endpoint.

### Implemented catalogue protocol (Phase 04)

Query keys/values are validated by src/lib/catalogue/query.ts. One value per key, q<=100 characters, consistent category/subcategory, curated collection/style/occasion values, sample purity18/22, sort featured/newest. Availability supports IN_STOCK, MADE_TO_ORDER, CUSTOM_DESIGN and UNAVAILABLE; the public seed contains no unsupported/unavailable design. Purity/status match the same eligible variant. Unsupported budget/weight fields, duplicated/invalid query fields and malformed/stale/query-mismatched cursors return400 INVALID_QUERY with a safe envelope. Cursors encode version/query signature/complete ordering key and ID; they are public pagination state, not authorization. A changed query/limit invalidates a reused cursor. Lists are bounded; no client receives the full future catalogue by default.

DesignCard adds designCode, description, subcategorySlug, collectionSlugs, purityOptions, customizationAvailable, quoteRequired and featured/newArrival. Media includes rightsBasis alongside its independent AI_GENERATED origin. Detail keeps variant definitions unchanged and projects statuses separately as variantStatuses:[{variantId,displayStatus}], with top-level displayStatus/availableVariantCount and null policyVersion. Physical stock quantities/ledger, generation prompts and private identifiers are not exposed. All public records are SAMPLE; draft records return404. Framework returns405 for mutations on read-only routes. Unexpected catalogue faults return503 CATALOGUE_UNAVAILABLE, never sample success. Categories return items/nextCursor:null; collection-list cursor is a published collection ID with max48. Unknown collection metadata is404.

No sessions, writes, persistent DB, guest authorization, quotas, provider adapters or production IP-rate limiter are implemented in Phase 04. Their proposed gates below remain unverified; do not deploy this local demo as a production service on the strength of read-only tests. Pages call the domain adapter directly for SSR; filter changes use the public list API with abort/race handling.

## 4. Wishlist, quotes, appointments and enquiries

| Method + path | Request / validation | Success data |
|---|---|---|
| `GET /api/wishlist` | Cookie; cursor/limit max48 | Owned list `{id, target:{kind,id}, summary:DesignCard|Revision}`; unavailable archived target is a safe unavailable marker, not a foreign object. |
| `PUT /api/wishlist` | `{target:{kind:"DESIGN"|"CONCEPT_REVISION",id:UUID}}`; published design or owned revision | 200 `{id,target,savedAt}`; unique owner+target; upsert creates no duplicates. |
| `DELETE /api/wishlist/[id]` | Owned wishlist ID | 200 `{removed:true}`; repeated owned deletion succeeds without exposing a foreign record. |
| `POST /api/quotes` | QuoteRequest below; cookie+CSRF+idempotency | 201 `{receipt:Receipt, confirmationPath:"/quotes/<reference>"}`; status SUBMITTED; after database commit only. |
| `GET /api/quotes/[reference]` | Owned reference | `{receipt,items: submittedSnapshots[],budget:null|Money,desiredDate:null|string,contact:ownContact,consentVersion}` no-store; no computed delivery promise. |
| `POST /api/appointments` | `{contact,consent,requestedDate,requestedTime?:"HH:mm",timeZone:"Asia/Karachi",channel:"STORE"|"PHONE"|"WHATSAPP",message?}`; future requested date, no claim of slot availability | 201 Receipt with status REQUESTED; no booking confirmation. |
| `GET /api/appointments/[reference]` | Owned reference | Receipt + requested fields/contact for inline form recovery. |
| `POST /api/enquiries` | `{kind:"GENERAL"|"VALUATION"|"FINANCING",contact,consent,message,rateSnapshotId?,calculation?}`; calculation requires snapshot and server revalidation | 201 Receipt with status SUBMITTED; no offer/credit decision. |
| `GET /api/enquiries/[reference]` | Owned reference | Receipt + own submitted snapshot; no public enumeration endpoint. |

QuoteRequest shape: `{items:[{source:QuoteSource, quantity:integer, optionValues:object, requestedChanges:string, attachmentIds:UUID[]}], contact:Contact, consent:Consent, budget?:Money, desiredDate?:dateOnly}`. Schema supports 1–5 items (initial UI uses one), quantity 1–5 each, max3 READY owned attachments/item and 5 distinct attachments/request. DESIGN variant must belong to design and optionValues must exactly match the selected allowed variant; requested deviations go in requestedChanges and trigger future human review. CONCEPT revision is owned, immutable and successful; CUSTOM requires a meaningful requestedChanges description. Server snapshots origin and source, never trusts a client price/status/owner.

Enquiry calculation: `{grossMassGrams:decimalString, nonGoldMassGrams?:decimalString, karat:14|18|21|22|24}`. Proposed mass range >0–1,000 grams, max3 decimals; nonGold between0 and gross. Server uses submitted snapshot and approved conversion version, computes its own result and rejects mismatch if a client sent an asserted authoritative value. Only approved supported purities are offered; these defaults are review inputs. No interest rate, LTV, loan amount, national ID or banking fields.

No public quote transition, quote acceptance, dispatch, repayment or stock-reservation API. Synthetic quote states are fixture reads, never customer-selectable status fields. Optional notification integration would extend notificationStatus after verified delivery; it must not change save success semantics.

## 5. Media contract

| Method + path | Request | Success data / guarantees |
|---|---|---|
| `POST /api/uploads` | `{fileName,mimeType,byteLength,purpose:"REFERENCE",permissionAccepted:true}` | 201 `{mediaId,uploadUrl,expiresAt,requiredHeaders}` for unique quarantined object; max5MiB, JPEG/PNG/WebP, max20 megapixels decoded. Signed upload expiry target10min. No arbitrary path, URL or overwrite permission. |
| `POST /api/uploads/[id]/complete` | Owned ID; `{}` | 200 `{mediaId,validationStatus:"READY"|"REJECTED",reason:null|string}` only after server download/byte-type/size/dimension checks and metadata-stripping re-encode. Missing object 409; oversize rejected/deleted. No AI access before READY. |
| `GET /api/media/[id]` | Owned READY private media or published public media | `{mediaId,url,expiresAt:null|timestamp,dataOrigin}`; private read URL target5min, no-store. Rejected/foreign object 404. |
| `DELETE /api/uploads/[id]` | Owned unsubmitted reference | 202 `{removalStatus:"QUEUED"}`; referenced enquiry attachment returns409 retention explanation; no deletion of published catalogue through public API. |

Enforce size at signing/policy where supported and independently during finalization; client-declared MIME/size is insufficient. Cap references to 10/session and total25MiB staged/ready bytes as reviewed application constants. Client upload failures preserve text draft and can retry only to the same unique object while signature is valid; expired signatures need another scoped request. Finalization rejects malformed images and disallowed content before downstream use.

## 6. AURIA conversation, jobs and realtime

| Method + path | Request | Success data / failures |
|---|---|---|
| `POST /api/ai/conversations` | `{language:"en"|"ur"|"roman-ur"}` | 201 `{id,version:0,language}`; creates owned empty record, no provider call. |
| `GET /api/ai/conversations/[id]` | Owned ID; optional beforeSequence/limit max50 | `{id,version,language,messages:[],nextBeforeSequence,activeOperationId:null|UUID}`; stored canonical messages, not provider secrets. |
| `GET /api/ai/conversations/[id]/events` | Owned ID; Last-Event-ID or afterSequence | 200 text/event-stream; ordered public events defined below; reconnect resumes from stored sequence, never starts paid work. |
| `POST /api/ai/chat` | `{conversationId,expectedVersion,message}` + idempotency; max4000 chars | 202 `{operationId,jobId,conversationId,version}` after quota/turn reservation; worker streams safe events; conflict if active typed/voice turn. Disabled chat503. |
| `POST /api/ai/image/analyze` | `{conversationId,mediaId}` + idempotency; READY owned image | 202 `{operationId,jobId}`; success job result `{attributes,limitations,matchBasis:"ATTRIBUTE_MATCH",designs:DesignCard[]}`; no assay/physical appraisal. |
| `POST /api/ai/image/generate` | `{conversationId,prompt,referenceMediaIds?:UUID[]}` + idempotency | 202 `{operationId,jobId,conceptId}`; max2 permitted references; creates no successful revision until output committed. |
| `POST /api/ai/image/edit` | `{conversationId,conceptId,parentRevisionId,instructions}` + idempotency | 202 `{operationId,jobId,conceptId}`; parent owned/same concept; actual parent image passed to provider, not just text describing it. |
| `GET /api/ai/jobs/[id]` | Owned ID | Job; SUCCEEDED result includes messageId (CHAT), analysis fields (ANALYZE), or Revision (GENERATE/EDIT); poll no faster than2s with backoff. |
| `POST /api/ai/jobs/[id]/cancel` | `{}`; owned ID | 202 Job; late result suppressed; no claim of provider-cost refund or immediate remote cancellation. |
| `GET /api/ai/concepts/[id]` | Owned ID | `{id,title,selectedRevisionId,revisions:Revision[]}`; initial maximum6 generation/edit jobs/session bounds history. |
| `PATCH /api/ai/concepts/[id]` | `{title?:string,selectedRevisionId?:UUID}` | 200 concept metadata; owned revision only; cannot mutate image/parent/provenance or submitted quote snapshot. |
| `POST /api/ai/realtime/session` | `{conversationId,expectedVersion,sdpOffer:string,language}` + idempotency | 201 `{voiceSessionId,sdpAnswer,deadline}` after server-mediated provider connection and control attachment. No primary key, private provider call ID or long-lived token returned. SDP max32KiB, syntax/media validation; one active voice/session. |
| `GET /api/ai/realtime/[id]` | Owned application voiceSessionId | `{id,status,deadline,usageState}`; statuses CONNECTING/ACTIVE/ENDING/ENDED/FAILED; does not expose remote credentials. |
| `POST /api/ai/realtime/[id]/end` | `{}`; cookie+CSRF | 202 `{id,status:"ENDING"}` or already ended state; backend confirms remote close and finalizes usage independently. Browser immediately stops local tracks/playback. |

Generate/edit instructions max2000 chars; provider content failures yield FAILED with recoverable message, not an empty success. Persist usage/operation reservations before dispatch. No arbitrary model/tool name/remote URL accepted. Application job kinds are CHAT/ANALYZE/GENERATE/EDIT; a CHAT job produces stored text/cards, not an image revision.

SSE frame: `id: <eventSequence>`, `event: <type>`, `data: {conversationId,operationId,payload}`. Types `message.delta`, `message.completed`, `catalogue.cards`, `job.updated`, `concept.revision`, `voice.updated`, `operation.failed`. Deltas are provisional; only completed stored messages are canonical. Replay/deduplication is by event ID. Lost/expired event retention returns a resync notice and client reloads canonical conversation. A heartbeating stream does not extend session expiry. User can end voice or cancel work without waiting for the stream.

## 7. Worked application examples (synthetic)

Quote request example requires a valid owned session and the actual displayed consent-policy version before use; it does not create or reference a seeded product:

```json
{
  "items": [{
    "source": {"kind": "CUSTOM"},
    "quantity": 1,
    "optionValues": {},
    "requestedChanges": "Sample floral ring concept for workshop review",
    "attachmentIds": []
  }],
  "contact": {"name": "Demo Customer", "preferredChannel": "EMAIL", "email": "demo@example.invalid"},
  "consent": {"processingAccepted": true, "policyVersion": "demo-draft-v1", "marketingOptIn": false}
}
```

Example response shape, not evidence of a saved request:

```json
{
  "data": {
    "receipt": {"reference": "DEMO-Q-EXAMPLE", "status": "SUBMITTED", "savedAt": "2026-11-17T00:00:00Z", "dataOrigin": "SAMPLE", "notificationStatus": "NOT_CONFIGURED"},
    "confirmationPath": "/quotes/DEMO-Q-EXAMPLE"
  },
  "meta": {"requestId": "example-request"}
}
```

Policy version must exist and be displayed/accepted in the actual demo; the example string is not an approved policy. Response/reference values are illustrative, not discoverable API fixtures.

## 8. Contract review gate

Review every endpoint's ownership, source union, policy/version handling, idempotency replay, upload quarantine and async result semantics. Verify that all UX actions map to these contracts or a direct public server-content read. No API testing, provider call, schema validation library or generated OpenAPI client has run in Phase 01. Executable schemas and integration tests belong to implementation.
