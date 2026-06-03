# WORKLOG

## 2026-06-03 — Clean break from alphabeta v1; new repo skeleton

Transitioned away from the predecessor project (static Next.js A/B-test analyzer) to a new product (discipline / decision-logging layer per the design handoff).

**Legacy housekeeping (predecessor preserved, frozen):**
- Pushed `feat/extension-scaffold` (8 unmerged GrowthBook-extension commits) to the old remote.
- Dropped the stash on `test/stats-transform` (WIP from a since-merged test branch).
- Disabled GitHub Pages on the old repo (deployed URL now 404).
- Renamed GitHub repo `mattpolicastro/alphabeta` → `mattpolicastro/alphabeta-legacy` (auto-redirect installed); archived the renamed repo.
- Renamed local `~/Projects/alphabeta` → `~/Projects/alphabeta-legacy`, updated origin URL, dropped `node_modules` (606 MB).

**New repo skeleton (`~/Projects/alphabeta`):**
- `git init`; `main` branch.
- `/design/` — full contents of the design handoff bundle (CLAUDE.md, README.md, lifecycle HTML prototypes, substrate/, explorations/, tweaks-panel.jsx, Design System).
- `/reuse/README.md` — manifest of code earmarked from `alphabeta-legacy` for copy-and-adapt as sprints reach them.
- Top-level `CLAUDE.md`, `README.md`, `WORKLOG.md`, `.gitignore`.

**Open:**
- Tech stack (pending claude.ai conferral). Constraints: IndexedDB-first, serverless, SHA-256 fingerprint immutability, individual-first. Pyodide not in MVP path.
- Sprint 1 build (Bet Front Door → Commit & Lock → Revisit) starts once stack is chosen.

Plan: `~/.claude/plans/i-have-a-claude-sprightly-fern.md`.
