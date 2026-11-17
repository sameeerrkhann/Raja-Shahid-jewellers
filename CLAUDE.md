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
