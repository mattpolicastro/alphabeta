# WORKLOG

## 2026-06-03 — Local-agents dispatch infra wired up

Brought up Aider+Ollama dispatch from MacBook Pro orchestrator to mlpc-ubuntu executor:
- `mattpolicastro/dotfiles@41ebe60` adds `scripts/dispatch` (Aider task runner with JSON spec, isolated git worktrees, ntfy-on-state, `--edit-format diff`, `--no-auto-commits`) and `scripts/setup-ubuntu` install steps for `ollama` (no-op when present), `aider-chat` via `uv tool install`, and `jq`. PATH fix for non-interactive SSH (uv installs to `~/.local/bin`, zsh profile not sourced).
- mlpc-ubuntu now has: ollama 0.24.0 native, `qwen3-coder:30b` + `devstral:latest` pulled, aider on PATH via the dispatch script, the alphabeta repo cloned at `~/Projects/alphabeta`.
- End-to-end `dispatch --dry-run` smoketest passes on mlpc-ubuntu.
- A/B baseline mid-Sprint-1 is now `qwen3-coder:30b` vs `devstral` (revised from `qwen2.5-coder:32b` — using what was already warm). `docs/local-agents.md` updated.

Open: NTFY_TOPIC not yet set on mlpc-ubuntu (notifications silent until `~/.cc-config` is dropped over). Not blocking.

## 2026-06-03 — Land planning handoff; tech stack settled

Persisted the claude.ai planning handoff at `docs/handoff-2026-06-03.md` and updated `CLAUDE.md`:
- Stack settled: Next.js static + TypeScript + React + **Tailwind** (tokens in config, component anatomy via `@apply` — replaces Bootstrap from predecessor), Dexie/IndexedDB, Pyodide (Layer 4a A/B only), Recharts, Cloudflare Pages/Workers, SHA-256 fingerprinting.
- Repo-layout policy: single-app at `~/Projects/alphabeta` for now; the handoff's `experiment-tools` monorepo proposal is deferred until the Chrome extension is ready to land alongside.
- Carried forward: deployment tiers (static / self-hosted / hosted), LLMProvider adapter seam, personas (newcomer / practitioner / diagonal user), three-layer toolchain, evidentiary-integrity context, the "what NOT to do" list.
- Open architectural threads documented: LLMProvider interface surface, Lambda fallback disposition, fold-if backward-edit loop, journal-index scope.

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
