# Repository Instructions — Claude Code

> ARCHIVED 2026-11-17: The user retired Claude Code from this project workflow. Codex is the primary development agent. The original instructions below are retained as history, not an active assignment or review gate.

You are reviewing or implementing portions of the **Raja Shahid Jewellers CUSTOMER-FACING DEMO** alongside Codex. The shared source of truth is `PROJECT_STATE.md`, NOT this file.

**START OF EACH TASK**
1. Read `PROJECT_STATE.md` from the repository root and inspect actual source and `git status`.
2. Respect current approved phase, scope, task ownership and existing decisions. Do not begin work on unrelated features or admin portal.
3. If the user requested a review, do NOT modify application code unless explicitly instructed; give concrete actionable findings.
4. If implementing, ensure Codex isn't simultaneously modifying the same working tree.

**END OF EACH TASK (EVEN IF REVIEW-ONLY OR BLOCKED)**
1. Append a truthful task entry to `PROJECT_STATE.md` including review findings or changed files, tests, blockers, and precise next handoff.
2. Update the active phase and handoff snapshot; preserve prior entries.
3. Never claim a mock, design placeholder, image render or voice UI is a real connected service unless verified.
4. Never commit credentials, sensitive customer data or real collateral/loan records.

Follow the user-provided Neural Stack 15-step development process summarized in `PROJECT_STATE.md`.

Raja Shahid Jewellers

Customer-Facing Website — Development Handover

Company: Neural Stack & Co.
Assigned Developer: Saad
Project: Premium Jewellery Website Demo
Current Status: Phase 03 Completed
Next Phase: Phase 04 — Jewellery Design Vault

1. Project Overview

We are developing a premium, luxury jewellery website for Raja Shahid Jewellers.

The website will showcase a large collection of jewellery designs, allow customers to discover products, request custom manufacturing, check gold rates, and submit jewellery enquiries.

The design should feel like an international luxury jewellery brand, with cinematic animations, elegant product displays, responsive layouts, and smooth interactions.

Your responsibility is strictly the non-AI customer-facing website. All AI-related development is assigned separately.

⸻

2. Development Already Completed

Phase 01 — Planning & Architecture

* Complete customer-facing project requirements.
* Website sitemap and page planning.
* API and database architecture documentation.
* Customer journeys and acceptance criteria.
* Cinematic homepage storyboard.

Phase 02 — Frontend Foundation

* Next.js, TypeScript, and Tailwind CSS setup.
* Premium design system and typography.
* Navigation, footer, reusable buttons, cards, and dialogs.
* Responsive layout foundation.
* /design-preview page.

Phase 03 — Cinematic Homepage

* Six scroll-driven homepage scenes.
* Luxury product imagery and parallax.
* Horizontal scrolling collection showcase.
* Animated typography and transitions.
* Responsive mobile layouts.
* Gallery navigation and interaction controls.

Reported verification: 35/35 browser tests passed. Homepage performance requires further optimization.

These features are already implemented. Review and preserve the existing work.

⸻

3. Your Assigned Development Scope

Phase 04 — Jewellery Design Vault

Build a premium jewellery catalogue supporting a large number of unique designs.

Categories include:

* Bridal jewellery and complete sets
* Rings
* Bangles and karas
* Necklaces and chains
* Earrings and jhumkas
* Tikkas and jhumars
* Bracelets and pendants
* Men’s jewellery
* New arrivals and signature collections

Features:

* Premium product cards and collection layouts.
* Product search and filtering.
* Categories, subcategories, and sorting.
* Product imagery and galleries.
* Availability information.
* Design IDs and product specifications.
* Support for hundreds or thousands of catalogue records.
* Mobile-friendly browsing.

Use clearly labelled sample products where genuine shop data is unavailable.

Phase 05 — Product Details & Custom Orders

Each product should have a complete detail page showing:

* Multiple jewellery images.
* Gold purity and available specifications.
* Weight or indicative weight range where verified.
* Available customization options.
* Product availability.
* Quotation enquiry.
* Manufacturing and delivery information.

Three product types:

1. In Stock: Jewellery physically available.
2. Made to Order: Existing designs that can be manufactured when requested.
3. Custom Order: Customer requests a new or modified design.

Implement the customer journey for requesting a made-to-order item, choosing supported options, submitting an enquiry, and viewing quotation/order status.

Manufacturing timelines must be configurable rather than invented.

Customer Features

* Wishlist and saved jewellery.
* Jewellery comparison where practical.
* WhatsApp enquiry buttons.
* Book a showroom appointment.
* Contact and location pages.
* About Us and craftsmanship pages.
* Customer order tracking interface.
* FAQs, policies, and information pages.

Gold Services — Non-AI

* Gold rates display.
* 24K, 22K, 21K and 18K rate presentation.
* Tola and gram conversion.
* Gold value calculator.
* Gold-rate API integration if approved and available.
* Gold-financing information and consultation enquiry UI.

All financial figures must distinguish live data from illustrative values. Do not implement actual lending or financing approvals.

UI/UX & Animation Improvements

* Premium collection transitions.
* Product hover effects.
* Image galleries and zoom.
* Smooth page transitions.
* Mobile-responsive components.
* Loading, empty, and error states.
* Accessibility and performance optimization.
* Improve existing homepage LCP where feasible.

All new pages must match the existing luxury design system.

⸻

4. Tasks NOT Assigned to You

Do not implement or modify the following AI functionality:

* AURIA AI chatbot.
* AI jewellery image generation.
* AI image analysis or editing.
* AI-powered jewellery search and recommendations.
* Voice-to-voice AI.
* AI prompts, model configuration, or AI API integrations.
* AI conversation and generation backend.

These features will be developed separately.

Preserve existing AURIA interface placeholders and avoid breaking their planned integration points.

⸻

5. Development Rules

1. Continue the existing repository; do not rebuild from scratch.
2. Read PROJECT_STATE.md, AGENTS.md, and the project documentation before starting.
3. Preserve all completed phases.
4. Work on assigned modules only.
5. Use the existing Next.js architecture and approved design system.
6. Test every implemented feature.
7. Avoid editing AI-related files.
8. Coordinate shared components before modifying them.
9. Update PROJECT_STATE.md after completing each task.
10. Record files changed, tests performed, issues, and next steps.

Use a separate Git branch for assigned work to prevent conflicts with the ongoing AI development.

6. Expected Deliverable

A premium, functional, responsive customer-facing jewellery website featuring:

* Cinematic homepage.
* Extensive searchable jewellery catalogue.
* Detailed product pages.
* In-stock and made-to-order functionality.
* Custom-order enquiries.
* Gold-rate information and valuation tools.
* Wishlist, appointments, WhatsApp integration and customer support pages.

The AI functionality is excluded from your assignment.

Your immediate starting point is Phase 04 — Jewellery Design Vault, followed by Phase 05 and the remaining assigned non-AI customer modules.