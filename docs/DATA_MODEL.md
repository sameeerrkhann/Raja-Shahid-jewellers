# Data model, relationships and demo catalogue

Status: Phase 04 typed local catalogue implemented, 2026-11-17; the database schema below remains conceptual. No SQL migration or database exists. Local fixture/asset manifests live in src/data/demo, types in src/types/catalogue.ts and projection/query functions in src/lib/catalogue; actual results are in PROJECT_STATE. [PRD.md](PRD.md) owns workflow/provenance; [API_CONTRACTS.md](API_CONTRACTS.md) owns transport. Proposed database names use snake_case; implemented DTOs use camelCase.

## 1. Common conventions and fulfilment projection

UUID primary keys, timestamptz timestamps stored in UTC, local display in Asia/Karachi. Stable unique slugs for published content; opaque random references for private receipts. Store monetary amounts as nonnegative integer minor units with currency (PKR for customer preferences/quotes); decimal masses/rates with explicit unit and precision. Use decimal arithmetic for valuation, not binary floating-point money. Unknown values are null, not 0. Version provenance, policy and source snapshots.

Every relevant record/media has `data_origin` (`SAMPLE`, `SHOP_APPROVED`, `AI_GENERATED`, `CUSTOMER_UPLOAD`). Manufacturing review is `SHOP_APPROVED`, `SAMPLE_ASSUMED` or `REVIEW_REQUIRED`; a generated image never grants approval. Publication is a separate `DRAFT`/`PUBLISHED`/`ARCHIVED` property. Only known designs with defensible sample metadata or shop approval enter the public vault. An AI concept stays private; converting it into an approved known design is a future human-controlled operation.

Public `displayStatus` is a derived view, not a quantity or the only fact: REVIEW_REQUIRED → CUSTOM_DESIGN; otherwise compatible positive stock of the same origin → IN_STOCK; otherwise supported manufacture → MADE_TO_ORDER; otherwise UNAVAILABLE. The last two states now explicitly use independent manufacturingAvailable. Zero stock alone never means unavailable. Purity/status queries consider the same eligible variants. Sample stock cannot imply real availability. Phase 04 preview explains mixed option statuses without implementing Phase 05 option selection. Future quote submission must not decrement/reserve stock.

## 2. Entity inventory

| Entity | Key fields / constraints | Relationships and purpose |
|---|---|---|
| categories | id, parent_id nullable, slug unique, label, rank | Parent 1:N child; design belongs to one leaf category; reject cycles |
| collections | id, slug unique, title, description, publication_state, hero_media_id | N:M designs via collection_designs |
| designs | id, slug unique, title, category_id, description, manufacturing_review, publication_state, data_origin, tags, published_at | 1:N variants/images; no private uploads or generated concepts published automatically |
| collection_designs | collection_id + design_id unique, rank | Reuse designs without duplication |
| design_images | id, design_id, media_asset_id, position, alt, is_primary | Media provenance stored once; ordered public gallery |
| design_variants | id, design_id, variant_code unique, karat nullable, option_values, mass_grams nullable, indicative_price_minor nullable, currency nullable | Approved combinations only; design-specific size/metal/finish options; weights/prices need source |
| physical_stock | id, variant_id, quantity_available >=0, data_origin, verified_at, source_note | Variant 1:N stock records; public API exposes availability/source, not sensitive stock ledger |
| media_assets | id, owner_session_id nullable, storage_key unique, visibility, purpose, mime, bytes, width, height, checksum, data_origin, validation_status, rights_basis, expires_at | Catalogue public assets have no guest owner; references/concepts private and owned; statuses QUARANTINED/READY/REJECTED |
| guest_sessions | id, token_hash unique, csrf_hash, created_at, expires_at, revoked_at | Owner of private demo records; no plaintext bearer tokens stored |
| ai_conversations | id, session_id, language, version, created_at | 1:N messages/concepts/voice sessions; optimistic turn sequencing |
| ai_messages | id, conversation_id, operation_id, sequence, role, modality, text, tool_summary, data_origin nullable | Unique conversation+sequence; provider context references private; no raw audio |
| generated_concepts | id, session_id, conversation_id, title, selected_revision_id nullable | 1:N immutable concept_revisions; no stock row |
| concept_revisions | id, concept_id, parent_revision_id nullable, revision_number, media_asset_id, prompt_summary, model_id, source_media_id nullable, created_at | Unique concept+revision_number; parent in same concept; AI_GENERATED and REVIEW_REQUIRED always |
| async_jobs | id, session_id, conversation_id, operation_id unique, kind, status, parent_revision_id, result_revision_id, result_payload, lease_until, attempt, provider_request_id, error_code | Kinds CHAT/ANALYZE/GENERATE/EDIT; CHAT stores text/cards, ANALYZE stores attributes/matches, image jobs store revisions; owned polling; no provider-started retry without reconciliation |
| quote_requests | id, session_id, reference unique, status, contact_fields, preferred_channel, budget_minor nullable, desired_date nullable, source_snapshot, consent_receipt_id | Demo creates SUBMITTED only; immutable snapshot of source/options/selected revision |
| quote_items | id, quote_request_id, design_id nullable, variant_id nullable, concept_revision_id nullable, quantity, option_snapshot, requested_changes | One or more items supported; demo UI initially one. Known variant must belong to design; custom revision is mutually exclusive with known design |
| enquiry_attachments | quote_request_id or customer_enquiry_id, media_asset_id | Exactly one parent; media must be owned READY before attachment |
| customer_enquiries | id, session_id, reference unique, kind, contact_fields, message, rate_snapshot_id nullable, calculation_snapshot nullable, consent_receipt_id | Kind GENERAL/VALUATION/FINANCING; no financial account or lending state |
| appointments | id, session_id, reference unique, requested_local_date, requested_local_time nullable, time_zone, channel, contact_fields, status, consent_receipt_id | REQUESTED only for new demo rows; no reserved slot |
| consent_receipts | id, session_id, purpose, policy_version, accepted_at, marketing_opt_in | Preserve explicit processing consent; no prechecked marketing |
| wishlist_items | id, session_id, design_id nullable, concept_revision_id nullable, created_at | Exactly one target; partial unique owner+target prevents duplicates |
| gold_rate_snapshots | id, source_id, locality, currency, base_karat, rate_per_gram, observed_at, fetched_at, integration_mode, conversion_version | Immutable normalized source; base_karat=24 for calculator; SAMPLE/CONNECTED only for stored valid snapshots |
| demo_orders | id, public_sample_reference unique, scenario, status, timeline, data_origin | Always SAMPLE, contains no actual contacts, unrelated to new quotes |
| policies | id, kind, version unique-with-kind, content, approval_state, published_at | Consent references exact privacy/terms versions; draft not implied approved |
| idempotency_records | session_id, route, key_hash, request_hash, status, response_reference, expires_at | Unique session+route+key; atomic retry/deduplication for mutations |
| usage_reservations | id, session_id, operation_id unique, capability, reserved_cost_minor, actual_cost_minor nullable, status, created_at | Atomic per-session/site quota and reconciliation; usage is not fabricated if provider result unknown |
| voice_sessions | id, session_id, conversation_id, provider_call_id private, status, deadline, started_at, ended_at, usage_state | One active per conversation/session; server-controlled lifecycle |
| conversation_events | id, conversation_id, event_sequence, event_type, public_payload, created_at | Ordered resumable UI events; deduplicate provider events before writing; payload excludes secrets |

No production customers table, loan/repayment/ledger, staff roles or inventory transactions are introduced. Guest identity is not evidence of a verified person. Content pages can start in versioned local files; policies need versioned references. Additional content tables/CMS are not prerequisites.

## 3. Relationship and integrity rules

Catalogue: category → designs → variants → physical_stock. Collection ↔ design uses a join. Design → design_images → media_assets. This keeps one design distinct from physical units and avoids duplicating every photograph for each variant.

Guest session → conversations → messages; conversation → generated concepts → revisions → media. Revision parent links preserve an edit tree. Parent/revision and selected_revision pointers must belong to the same concept and owner; cross-owner references are rejected even if UUIDs are known. Concurrent edits may branch from the same parent; allocate revision numbers transactionally and never overwrite an output.

Guest session → quote requests → items → known design/variant OR selected concept revision. The saved snapshot remains stable if catalogue content or selected revision later changes. Foreign keys can preserve source identity, but the snapshot owns the submitted description/provenance. Never cascade-delete a submitted snapshot merely because its catalogue design is archived. Customer enquiries can reference an immutable rate snapshot. Public sample orders are intentionally outside this chain.

Apply foreign keys, enum/check constraints, uniqueness and quantity/mass bounds in the database as well as input validation. Cross-row ownership/parent validation needs transactional queries/policies, not a simple CHECK that reads other rows. Retention erasure removes private relationships deliberately; do not cascade through public catalogue. [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)

## 4. Access and indexing plan

Use the restricted-role/session-context boundary in architecture. Catalogue reads project only PUBLISHED allowed records. Private rows deny access without context; all child policies join to the owning parent. No public list endpoint exists for quotes, contacts, conversations or jobs. Storage key knowledge never grants download access. A privileged storage API is separately guarded; RLS is not a substitute for that guard.

Plan indexes for every ownership/join access path: session_id on private parents; conversation_id+sequence on messages/events; concept_id+revision_number on revisions; design_id on variants/images; variant_id on stock; collection join in both directions; job status+lease_until; reference unique; expiry for cleanup. Indexes are proposals until query plans are measured. Use a stable catalogue sort tuple (rank+id for featured, published_at+id descending for newest) and a cursor carrying every sort key plus query signature. Do not claim constant-time performance for arbitrary filters/full-text queries. Add a search index for title/style/category text once actual seed/query behavior is known; Urdu/Roman Urdu synonyms can begin in curated tags.

Measure filtered query plans with an 80-record seed and separate synthetic 10k-record scale test; 10k fake test rows never become advertised designs. Avoid N+1 gallery fetches; return bounded thumbnail projections. No partitioning/vector extension is required initially. Security/index details are conceptual; no SQL, grants or RLS were executed.

## 5. Seed catalogue contract

Original target80 was reduced by the latest Phase 04 assignment to25–40 where distinct imagery permits. Built-in generation completed11 then failed; the user explicitly accepted “Finish with available imagery.” Current public seed:11 distinct designs (4 bridal,5 rings,2 bangles), each with one original AI concept image and480/960px derivatives. Fourteen remaining authored briefs are DRAFT and excluded from APIs/pages; they are not advertised designs and missing media cannot become broken public cards. Six root categories/four editorial collections remain available with truthful empty states. New arrivals/signature are flags/collections, never duplicate products. Further imagery needs separate approved asset work, not padding.

src/types/catalogue.ts separates CatalogueDesign, DesignVariant, PhysicalStock, CatalogueMedia and collection membership. Every design has stable UUID/designCode/slug, description, root+leaf category, styles/occasions, sample purity options (or null), ordered gallery, customization/manufacturing/review/quote flags, nullable sourced weight range and manufacturing-time policy, ranking and synthetic publication dates. physical stock is a separate array keyed to variants; one design illustrates two distinct units and another mixed18/22 sample availability. Fixtures carry SAMPLE at design/stock level; media is independently AI_GENERATED. No actual inventory, assay, price, weight, lead time or feasibility is verified. All amounts/masses/timing are null. Publication requires an entry in the inspected local asset manifest; private AI outputs/uploads have no automatic route into this public seed.

Each seed record needs a stable internal ID/slug, leaf category, title, neutral style description, curated style/occasion tags, origin SAMPLE, manufacturing review SAMPLE_ASSUMED, valid variants, ordered media with alt text and rights/provenance, publication state and consistent sample stock where applicable. Unknown masses/prices remain null. A labelled AI illustration may depict a sample design, but its media origin remains AI_GENERATED and it cannot certify an actual manufacturable design or physical item. Never mix that media provenance with stock evidence.

Illustrative schema example only; these identifiers and assets are not seeded or present:

```json
{
  "slug": "sample-floral-ring-01",
  "title": "Floral Ring — Sample Design",
  "categorySlug": "rings",
  "dataOrigin": "SAMPLE",
  "manufacturingReview": "SAMPLE_ASSUMED",
  "styles": ["floral"],
  "occasions": ["wedding"],
  "variants": [{"code": "SAMPLE-R01-A", "karat": 22, "massGrams": null, "indicativePrice": null}],
  "sampleStock": [],
  "images": []
}
```

This incomplete example must fail publication until permitted images/alt/provenance and required variant options are provided. `sampleStock: []` projects sample MADE_TO_ORDER. A positive sample stock fixture must carry SAMPLE at stock, card and detail level. No made-up 22K assay is asserted for a real piece; the example is a sample design preference.

Additional fixtures: one item with multiple variants and mixed sample availability; zero-match filters; archived slug; missing/failed media; concept with v1 and edited v2; denied/expired job; two owners; duplicate quote retry; source snapshot retained after product edit; one sample gold snapshot with arbitrary clearly labelled amount/time; stale/no-feed states; one example order reference with a static synthetic timeline. Reset tooling must target only isolated demo/test records, preserve enquiry data until its retention decision, and never delete a whole database or public bucket.

## 6. Review gate

Review entity necessity, source/status projection, constraints across owners, immutable snapshots and cleanup. Confirm sample count/assets, option taxonomy, tola convention, privacy retention and whether the proposed SQL-role/session-context approach is acceptable. Physical manufacturing feasibility, migration syntax, access policies and query performance remain unverified until implementation tests.
