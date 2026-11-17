# Frontend, backend and runtime architecture

Status: Phase 04 local public catalogue implemented, 2026-11-17. Frontend plus five read-only catalogue handlers exist; no database/private backend/provider service is provisioned. Private persistence/security/deployment choices below remain proposals, not validated by a successful build. [PRD.md](PRD.md) owns decisions; [DATA_MODEL.md](DATA_MODEL.md), [API_CONTRACTS.md](API_CONTRACTS.md) and [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md) own detailed contracts.

## 1. Architecture decisions for review

| ID | Proposed choice | Reason and limitation |
|---|---|---|
| A-01 | Implemented: Next.js App Router 16.4.6, React 19.3.1, TypeScript 5.9.3, Tailwind 4.3.5, pnpm 10.33.0; Node 22 | Single root project/lockfile; GSAP 3.15.1 for isolated motion. Exact dependencies and scripts in package.json/README. |
| A-02 | Server-render content/catalogue; small client islands for filters, forms, wishlist, motion and AURIA | Public content remains readable; expensive voice/image UI loads on demand. Never import privileged adapters into client bundles. |
| A-03 | Next.js Node-runtime route handlers as the public backend-for-frontend | Same-origin session and validation; no browser access to private DB tables or provider keys. Server-rendered pages call the domain layer directly, not an internal HTTP loop. |
| A-04 | PostgreSQL hosted with Supabase proposed; private Supabase Storage for uploads/concepts | Durable owned demo data and media; provider/region/budget still O-05. Direct pooled SQL for application data, Storage API server-side for objects. |
| A-05 | Guest sessions, no account system in demo | Supports owned same-browser persistence without introducing customer/staff authentication scope. Session loss/recovery limitation explicit. |
| A-06 | OpenAI proposed for chat/vision, images and Realtime GA speech | Capability-based adapters and environment-selected models. Account/model compatibility/budget unverified; no automatic switch to another protocol or provider. |
| A-07 | Durable database-backed async jobs plus a separate long-lived Node worker | Images survive web request timeouts/reloads; worker can host server-side voice control. Deployment must support outbound provider connections and verified job execution. |
| A-08 | Catalogue metadata/attribute retrieval first; no vector service in baseline | Honest image-analysis-to-attribute matches; embeddings are optional later and must earn their complexity through evaluation. |

Next.js documents server rendering by default and client boundaries for interactive/browser features; this supports A-02, not a claim about our unbuilt app. [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

## 2. Module boundaries and request paths

Phase 04 extends the same root project: home and preview stay intact; src/app/designs and collections supply customer catalogue routes, src/app/api supplies only public catalogue reads, src/components/catalogue owns bounded UI/filter/preview states, src/types owns safe contracts, src/data/demo owns immutable sample records/media prompts, src/lib/catalogue owns pure validation/projection and src/lib/server/catalogue.ts owns the replaceable repository adapter. Server pages query that adapter directly; client changes fetch bounded results with AbortController and URL state through native History/Next search params. No whole-catalogue client import, private writes or empty business-route stubs. A route group is not a reason to recreate the root layout.

Future work inside the existing modules: persistent catalogue repository/query indexes, private session/database/storage/providers/quota/jobs, quote/valuation domain and src/worker. Public local catalogue code does not provision or validate these private paths. Server secret configuration validation remains future work. No new environment variable or dependency is needed by the Phase 04 demo.

Catalogue path: browser or server-rendered page → validated query → catalogue service → published projection → public DTO. Quote path: owned session + validated source → domain validation → one database transaction for enquiry/snapshot/consent/idempotency → committed response. AI path: owned conversation → quota reservation → provider/worker → validated tool/results → stored event/message or immutable revision → UI. Gold path: source adapter → normalized immutable snapshot → freshness evaluation → board/calculator; calculations retain that snapshot ID.

Do not turn every domain into a network microservice. Web and worker share schemas/validation/domain code, but only the worker may claim a job lease. No staff endpoints, production fulfilment automation or public SQL/tool execution.

## 3. Persistence, ownership and access

Catalogue records may use a dedicated catalogue schema; customer sessions, contact fields, conversations, jobs and audit metadata use non-exposed `app_private`. Runtime uses a dedicated non-owner SQL role without BYPASSRLS, restricted grants and a pooled connection. Each owned operation resolves the session server-side and sets its trusted session ID only inside the transaction; query ownership and row policies must agree. Never reuse session context across pooled requests. Migration credentials are separate and unavailable to normal requests.

No browser Data API access is required. If later introduced, it needs an explicit exposure/grants review as well as RLS; new-table visibility cannot be assumed. Supabase distinguishes object grants from row policies, and its changelog records changes to automatic table exposure. [API security](https://supabase.com/docs/guides/api/securing-your-api), [Data API exposure change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)

Storage uses separate restricted server credentials where supported; any privileged storage credential is isolated to the storage adapter. It does not authorize a caller. Before signing, downloading or deleting an object, validate the session's database media record and permitted purpose. Reference uploads and generated concepts are private; published approved/sample catalogue derivatives are a separate public bucket. Storage service credentials can bypass row policies, so browser exposure is forbidden. [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)

Guest session proposal: random 256-bit opaque token, hash/HMAC stored in `guest_sessions`, 7-day absolute expiry, no silent extension. Production cookie `__Host-rsj-session` is Secure, HttpOnly, SameSite=Lax and Path=/ with no Domain. Derive a recoverable CSRF token from the bearer using a purpose-separated keyed function, store its hash separately and return the token to same-origin client memory after session creation/recovery; review the exact implementation before coding. Require it plus exact allowed Origin on mutations, except initial session creation, which still requires Origin and JSON validation. Use a clearly documented localhost-only development cookie exception during setup. Never use a query parameter/reference as session authority.

Application role policies must be tested with two distinct sessions and without context, including reused pooled connections. No reliance on `authenticated` role alone, browser-submitted owner IDs, user-editable metadata, or a privileged connection that bypasses all RLS. Catalogue/public projection excludes contact details, quantities not approved for public display, private prompts and provider identifiers. See the independent ownership tests in acceptance.

## 4. Jobs, concurrency and consistency

Chat, analysis and image requests create durable `async_jobs` rows and reserve quota before returning 202. Worker claims with an atomic lease, records provider request ID when available and heartbeats. CHAT commits completed text/cards, ANALYZE commits attributes/matches, and image jobs commit output media plus revision before SUCCEEDED. Web request completion is not job execution. Long-running work must not rely on a serverless function continuing after it returns.

Lease expiry is not permission to issue the same paid request again. Distinguish safe pre-provider retries from ambiguous provider-started failures. Mark ambiguous outcomes for reconciliation; query provider state where supported or show failure requiring explicit user retry and possible additional cost. Deduplicate by operation ID and job attempt. Cancellation is best-effort: CANCEL_REQUESTED blocks publication of late results but may not recover spent provider cost. Parent revisions remain readable after failed/cancelled edits.

Quote/enquiry/appointment writes use transactional idempotency scoped to session + route + key + body hash, retained at least 24 hours; mismatch returns conflict. Session quota reservations and the site-wide budget must be atomic so concurrent requests cannot bypass limits. No new quote reserves inventory. Wishlist uses unique owner/target constraints and idempotent PUT/DELETE semantics.

## 5. Configuration contract proposal

All values below are names only. Phase 00 provider-neutral candidates are superseded by this proposed contract if approved. Phase 02 adds a non-secret `.env.example` with paid features off and blank credentials; the static preview requires no environment file. Nothing validates or connects these future integrations yet.

| Name | Visibility / purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public canonical origin; never a secret |
| `DATABASE_URL` | Server/worker restricted pooled runtime role; database connection |
| `DATABASE_MIGRATION_URL` | Offline setup/CI migration owner only; not normal web/worker runtime |
| `SESSION_TOKEN_PEPPER` | Server-only keyed token hashing; rotation expires sessions deliberately |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Server/worker Storage adapter only; never NEXT_PUBLIC; actual key scope verified before use |
| `STORAGE_PUBLIC_BUCKET`, `STORAGE_PRIVATE_BUCKET` | Server configuration; buckets have deliberately different policies |
| `OPENAI_API_KEY` | Server/worker only; provider credential |
| `AI_CHAT_MODEL`, `AI_VISION_MODEL`, `AI_IMAGE_MODEL`, `AI_REALTIME_MODEL` | Server-selected compatible model IDs; no hard-coded IDs approved here |
| `AI_CHAT_ENABLED`, `AI_IMAGE_ENABLED`, `AI_VOICE_ENABLED` | Explicit independent gates; false until configured and smoke-tested; true alone is not proof of connectivity |
| `AI_SITE_DAILY_BUDGET_MINOR` | Required approved spend ceiling in USD minor units; absent/zero disables paid features |
| `AI_SESSION_CHAT_LIMIT`, `AI_SESSION_IMAGE_LIMIT`, `AI_SESSION_VOICE_SECONDS` | Proposed starting limits 40 turns, 6 total generate/edit jobs, 300 cumulative voice seconds; budget review may lower them |
| `GOLD_RATE_MODE` | `sample` or `live`; never silently falls back between modes |
| `GOLD_RATE_API_URL`, `GOLD_RATE_API_KEY` | Server source adapter, key optional depending on feed; endpoint allowlist, not supplied by visitors |
| `GOLD_RATE_REFRESH_SECONDS`, `GOLD_RATE_STALE_SECONDS` | Provider/owner-approved cadence and freshness limits; required for live mode, not guessed |
| `WORKER_ENABLED` | Web validates job/voice worker readiness; enabling a flag is insufficient without heartbeat/capability checks |

Brand spelling, AURIA display strings, contacts, provenance labels, conversion conventions and policy versions belong to typed versioned configuration/content rather than scattered environment strings. External credentials, optional notification provider settings and deployment regions require O-04/O-05 decisions. No browser Supabase key is needed by this design. Exact database client, validation library and test-tool versions are selected in setup; candidate tools are a typed SQL client, Zod, Vitest and Playwright, not installed dependencies.

## 6. Caching, failures and observability

Cache only published catalogue/content with explicit invalidation after an approved seed change. Guest pages/responses, provider session establishment, upload signing, AI messages and private images are no-store. Never include raw contact fields, tokens, signed URLs, image bytes or full prompts in request logs. Log opaque request/job IDs, durations, error class, model identifier and usage metadata with redaction.

Gold snapshots are append-only with provider time and fetch time; failed refresh retains the last snapshot with STALE and error context. If no valid snapshot exists, show unavailable. Live freshness thresholds are unknown until provider selection. Separate “latest successful sample” from “latest live”; never relabel one as the other. Backoff transient feed/provider faults without repeated client-triggered refresh storms.

Catalogue remains usable when AI is off. Failed database writes must never yield success receipts. Disconnection during chat leaves a recoverable stored operation; do not issue a second charge just because the browser reconnected. Health responses expose booleans/modes only, not environment values, model credentials or internal error traces.

## 7. Privacy and operational proposal

Proposed retention, pending O-07: guest sessions/messages/concepts 7 days; unattached uploads 24 hours; consented enquiry contact/snapshots 30 days; redacted operational metadata 30 days. Provider-side retention is separate and must be verified for the selected account; local deletion is not a promise that a provider retained nothing. No raw voice audio recording in the demo. Store only needed transcripts after disclosed consent. Removing a session closes active voice and revokes owned access immediately; erasure/expiry jobs then remove private objects and records according to approved retention and enquiry purpose. Submitted enquiry attachments survive only for the approved enquiry retention, not indefinitely.

Use synthetic contact fixtures until the owner approves privacy wording and handling of real contacts. Do not collect national IDs, banking information, real collateral images or loan documents. Uploads accept only validated image types/size; re-encode to strip metadata, check decoded dimensions, block SVG/HTML/remote URL fetching, and apply content screening before provider use. Keep staging objects quarantined until validated. CDN/public bucket receives no private originals.

## 8. Setup and deployment handoff

Phase 02 establishes local Git on `main` (no remote/automatic commit), one root package/lockfile, ignore rules, Node 22/pnpm compatibility, README, and local type/lint/build/Playwright checks. Hosted CI is not configured because no remote/host has been chosen; local scripts are not a claimed CI pipeline. ESLint 9 is deprecated but retained for the declared React/accessibility plugin peer ranges; upgrade the compatible chain deliberately. Supabase is not installed; inspect the actual future CLI version/help and target before migration commands. [CLI v3 change](https://supabase.com/changelog/supabase-cli-v3)

Choose a Next-compatible HTTPS host plus a long-lived worker host/region near the database; provider account, resource budgets and limits remain unresolved. Verify streaming, request/body limits, private object limits, pooled transaction context, worker leases and authoritative voice stop there before enabling capabilities. Phase 02 provisions no services, migrations or deployment. The current global Permissions-Policy denies microphone/camera/geolocation; the future voice phase must deliberately allow microphone only where needed and verify consent/security. Global noindex headers protect discoverability, not access control.
