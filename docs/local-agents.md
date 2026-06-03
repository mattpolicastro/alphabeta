# Local agents — dispatch plan

> **Purpose:** Document how local-model coding agents (Aider + Ollama on mlpc-ubuntu) are used to parallelize implementation work on this project, and the prep needed before they come into play.
>
> **General-purpose dispatch tooling** (the eventual `dispatch.sh`) lives in [`mattpolicastro/dotfiles`](https://github.com/mattpolicastro/dotfiles) (`scripts/dispatch.sh`), not in this repo. This document is project-specific policy.

## Decisions

| Decision | Choice |
|---|---|
| Orchestrator runs on | The Mac (interactive Claude Code / Opus). |
| Executor runs on | mlpc-ubuntu (Aider in git worktrees, Ollama as local inference). |
| Network | SSH over Tailscale, Mac → mlpc-ubuntu. |
| Model baseline | **A/B mid-Sprint-1**: same task dispatched twice — once to `qwen3-coder:30b` (already loaded on mlpc-ubuntu), once to `devstral`. Compare on pass/fail, retry count, code quality. Pick baseline for Sprint 2. |
| Notifications | ntfy via `cc-run`-style wrapper; include hostname in title so multi-machine jobs are distinguishable. |
| Task shape | Single-component / single-file leaf tasks (predecessor's protocol — same rules carry over). |
| Sprint 1 split | API Claude does Sprint 1 (pattern-setting). Local agents come in at the Sprint-1 → Sprint-2 boundary, except the one A/B test task. |
| Parallelism | Up to `OLLAMA_NUM_PARALLEL` agents concurrently. Tune once 32B model load and VRAM headroom are observed on mlpc-ubuntu. |

## Why this shape

- **Sprint 1 is pattern-setting work.** Tailwind config from design tokens, Dexie schema, SHA-256 fingerprint utility, the first lifecycle component. Cost of agent drift is highest where conventions are first being established. API Claude wins on ambiguity tolerance.
- **Sprint 2 onward has prior art.** Once components exist as patterns to copy, local agents pattern-match reliably. The dispatch protocol from `alphabeta-legacy/CLAUDE.md` (single-file, paste-existing-pattern, verification command, file allowlist) is calibrated for this regime.
- **A/B baseline during Sprint 1** is cheap insurance against committing to the wrong model. One self-contained task (candidate: the SHA-256 fingerprint utility + tests — small, well-spec'd, clear pass/fail) gets dispatched twice. Cost: ~30 min of human review for clean baseline data.

## Suitable tasks

Local agents (Aider + 32B-class model):
- Component scaffolds following an existing pattern (e.g., second/third bet-lifecycle screen after the first one is in).
- Test suites mirroring an existing one (`__tests__/<Component>.test.tsx` following the established style).
- Mechanical ports (Bootstrap → Tailwind on lifted components from `alphabeta-legacy`).
- Single-file utilities with clear input/output (formatters, validators).

API Claude (Opus orchestrator, Sonnet sub-agents):
- The `LLMProvider` adapter interface and its first implementations.
- Anything cross-cutting (schema changes touching multiple consumers).
- Anything ambiguous in the design handoff (deviation logging UX, journal-index scope decisions).
- Code review of merged local-agent PRs.

## Dispatch contract

When dispatching to a local agent, the prompt must include — non-negotiable, drawn from the predecessor's experience with 14B drift, still applies at 32B but with a wider safety margin:

1. **Exact file paths** to read and modify.
2. **The specific change** in concrete terms — not "add validation" but the signature, fields, return shape.
3. **Existing pattern to follow**, pasted inline. The model copies more reliably than it interprets.
4. **Type signatures and interfaces** referenced, pasted inline. Do not assume the agent finds them.
5. **A verification command** (`npm run build`, `npm test -- <path>`, `npx tsc --noEmit`).
6. **A `--file` allowlist** passed to Aider to lock it to the right files.

Anti-patterns (these caused failures on the predecessor):
- "Refactor X to be cleaner" — vague, no exit condition.
- "Update all references to Y" — requires repo-wide search the agent can't do reliably.
- Tasks touching 4+ files — split.
- Asking the agent to choose between approaches — decide in the orchestrator.
- Prompts over ~150 lines — escalate to Sonnet via API Claude instead.

## Worktree & parallelism rules

- Each dispatched task runs in its own git worktree on mlpc-ubuntu.
- File-disjoint tasks run in parallel up to `OLLAMA_NUM_PARALLEL`. File-sharing tasks serialize.
- Max ~3 parallel tasks at the 32B model size until VRAM/throughput is characterized.
- Batch by dependency tier: leaf tasks first, merge, then next tier.
- Always rebase onto `main` before opening a PR. Orchestrator merges; sub-agent does not.

## Notifications

`dispatch.sh` wraps Aider in `cc-run`-style logging. On dispatch:
- Low-priority ntfy on start: `[mlpc-ubuntu] <job-id> started: <truncated prompt>`.
- Default on success: `[mlpc-ubuntu] <job-id> done in <duration>`.
- High on failure: `[mlpc-ubuntu] <job-id> failed (exit <code>) — see <log>`.

Logs to `~/.cc-logs/` on mlpc-ubuntu, same convention as the Mac side.

## Prep checklist (before Sprint 2 / before the Sprint-1 A/B test)

- [x] SSH from MacBook Pro → mlpc-ubuntu working with key auth.
- [x] Ollama 0.24.0 running natively on mlpc-ubuntu.
- [x] `qwen3-coder:30b` already pulled on mlpc-ubuntu.
- [x] `dispatch` script written and committed (`mattpolicastro/dotfiles@327d9bf`, `scripts/dispatch`). Reads a JSON task spec; uses Aider with `--edit-format diff` and `--no-auto-commits`; reads `OLLAMA_HOST` (default `localhost:11434`).
- [x] `setup-ubuntu` updated with idempotent install steps for `ollama` (no-op when present), `aider-chat` (via `uv tool install`), and `jq`; adds `dispatch` to the symlink loop.
- [ ] **You run on mlpc-ubuntu:** `cd ~/Projects/dotfiles && git pull && scripts/setup-ubuntu` — installs aider, uv, jq; symlinks dispatch.
- [ ] **You run on mlpc-ubuntu:** `ollama pull devstral` — A/B contender against the already-warm qwen3-coder:30b.
- [ ] tmux already present on mlpc-ubuntu (installed by `setup-ubuntu`).
- [ ] ntfy `cc-run`-style wrapper available on mlpc-ubuntu via the dotfiles symlink (verify `NTFY_TOPIC` is set in `~/.cc-config`).
- [ ] End-to-end dry-run: `dispatch --dry-run sample-task.json` on mlpc-ubuntu — surfaces any missing pieces before a real task.

## A/B test plan (mid-Sprint-1)

When Sprint 1 reaches the fingerprint utility:

1. API Claude writes the spec: signature, hash inputs, deterministic ordering, test cases. Lands inline in the dispatch task JSON.
2. Dispatch to `qwen3-coder:30b` on mlpc-ubuntu; worktree branch `feat/fingerprint-qwen3`.
3. Dispatch to `devstral` on mlpc-ubuntu; worktree branch `feat/fingerprint-devstral`.
4. Compare: did each pass the verify step (`npm test -- fingerprint`)? Lines of code? Style match? Required follow-up edits? Time to converge?
5. Pick the winner as Sprint-2 baseline; document the result in a `## Results` section below.
6. Discard the loser's branch. Land the winner's via standard review.
