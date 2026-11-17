# Repository Instructions — Codex

This repository is for the **Raja Shahid Jewellers CUSTOMER-FACING DEMO**. Admin portal is deferred.

**ACTIVE WORKFLOW (2026-11-17):** Codex is the primary development agent for all future phases. Claude Code is retired from this workflow; `CLAUDE.md` and older handoffs are historical. Reviews performed by Codex must be labelled **Codex internal review**, never independent review. Follow the user's current phase authorization and hand off to the next Codex session.

**MANDATORY BEFORE EVERY TASK**
1. Read `PROJECT_STATE.md` in full and inspect actual code and `git status`.
2. Announce the active phase, task scope, and files you intend to edit.
3. Do NOT silently work on later phases, rewrite existing work, fake connected AI/voice/gold APIs, or expose credentials.
4. Only one agent may write to this shared working tree at a time.

**MANDATORY AFTER EVERY TASK, INCLUDING PARTIAL OR FAILED WORK**
1. Run appropriate tests and inspect the diff.
2. Update `PROJECT_STATE.md`: phase status, changes, file paths, actual functionality, commands/results, blockers, decisions, and exact handoff to next agent.
3. Do not say `PROJECT_STATE.md updated` unless you've saved it.
4. Keep all real-vs-demo data accurately labelled; AI concepts are not manufacturable guarantees.

Current task instructions come from the user's prompt and `PROJECT_STATE.md`. Use the Neural Stack 15-step workflow summarized there; no full admin portal during this phase.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
