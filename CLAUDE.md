# CLAUDE.md

## Project

A/B test analysis tool — static Next.js app with client-side IndexedDB and in-browser stats via Pyodide/WASM. See `architecture.md` for tech stack, directory layout, and conventions. See `requirements.md` for product requirements (v2 roadmap + v1 reference appendices). The original v1 spec is archived at `archive/requirements-v1-archived.md`. See `TODO.md` for task status.

## Build & Verify

```bash
cd apps/web && npm run build    # static export to out/; must pass before merging
npm test                        # once Jest is configured (see TODO.md Infrastructure)
```

## Multi-Agent Protocol

### Roles

- **Orchestrator (you, or a supervisory agent):** Owns the TODO.md, sequences work, dispatches tasks, reviews outputs, and merges. Makes all architectural decisions.
- **Sub-agents:** Implement one discrete task each. They do not make architectural choices, modify shared interfaces beyond what's specified, or depend on another sub-agent's in-flight work.

### Dispatching a task

When handing a task to a sub-agent, provide exactly:

1. **The TODO.md entry** — the specific row being implemented.
2. **Relevant files only** — the source files the task touches (listed in TODO.md). Do not dump the full repo.
3. **Acceptance criteria** — what "done" looks like (e.g., "exports a `<TagFilter>` component that takes `tags: string[]` and calls `onFilter`; passes `npm run build`").
4. **Constraints** — style guide, existing patterns to follow, shared-file rules (see below).

Do **not** include: unrelated modules, open design questions, or the full project context.

### Orchestrator checklist

- [ ] Parse TODO.md and identify tasks ready to start (all dependencies met, not claimed).
- [ ] Check for parallelism: tasks that touch **different files** can run concurrently; tasks sharing files must be serialized.
- [ ] **Screen for mis-scoped tasks** before dispatching (see red flags below).
- [ ] Write or verify integration tests / type contracts **before** dispatching implementation.
- [ ] After a sub-agent delivers, validate: builds pass, tests pass, only expected files changed.
- [ ] If a sub-agent's output fails validation, re-dispatch with the error context — don't patch it yourself silently.
- [ ] Update TODO.md status after merge (`[~]` → `[x]`).

#### Red flags: task is wrong for a sub-agent

Stop and rethink the decomposition if any of these are true:

1. **Task touches a shared interface.** If the task requires adding/changing fields in `lib/db/schema.ts`, modifying exports from `lib/db/index.ts`, or altering types in `lib/stats/types.ts`, the orchestrator should make those changes first and hand the sub-agent a stable interface to code against. Sub-agents consuming a shared interface is fine; sub-agents *defining* one is not.

2. **Task says "update all callers/references."** This requires codebase-wide search that sub-agents (especially local ones) can't reliably do. The orchestrator should enumerate the exact call sites and either handle it directly or split into per-file tasks.

3. **Task requires choosing between approaches.** If the prompt contains "pick the best," "decide whether to," or "if X then do Y otherwise Z" — the decision belongs to the orchestrator. Resolve the ambiguity, then dispatch the mechanical result.

4. **Task has implicit dependencies on in-flight work.** If task B needs types or functions that task A is currently producing, task B is not ready. Wait for A to merge, then dispatch B with the concrete interface.

5. **Task scope creep via "and also."** A task that starts as "add a validation function" but also asks the agent to "wire it into the form, add error display, and update the tests" is three tasks. Each additional integration point multiplies the chance of a local agent going off-track. Split at the seam.

6. **The prompt requires more than ~200 lines of context to specify.** If you're pasting extensive background, type definitions, and examples just to frame the task, the work likely involves too much implicit knowledge. Either handle it at the orchestrator level or break it down further.

### Sub-agent rules

1. Only touch files listed in your assigned task.
2. Follow existing patterns in neighboring files — don't invent new conventions.
3. If you hit an ambiguity or need to change a shared interface, **stop and ask the orchestrator**. Do not guess.
4. Run `npm run build` before declaring done.
5. Keep commits atomic: one logical change per commit, clear message.

### Model selection

The orchestrator should always use a high-capability model (e.g., Opus). Sub-agents can use lighter models to save cost and latency when the task is well-scoped. Use the following as a guide:

| Model tier | When to use | Example tasks |
|---|---|---|
| **Opus** | Orchestration, ambiguous tasks, multi-file reasoning, code review | Planning, dependency analysis, PR review, complex debugging |
| **Sonnet** | Moderate implementation with clear specs | Single-component features, CRUD functions, integration wiring |
| **Haiku** | Mechanical, pattern-following work with a clear template | Unit tests mirroring an existing suite, boilerplate components, renaming/reformatting, docstrings |
| **Local (Aider + qwen2.5-coder:14b)** | Narrowly scoped, file-level tasks with explicit instructions | Single-file edits, adding a function to an existing module, writing tests from a template, applying a known pattern |

**Rules of thumb:**

- Default to Sonnet for sub-agents. Escalate to Opus only if the task involves cross-module reasoning or underspecified requirements. Drop to Haiku for purely mechanical work.
- The tighter the dispatch prompt, the more reliably a lighter model executes. If you find a Haiku sub-agent failing, tighten the spec before upgrading the model.
- A failed-and-re-dispatched task costs more than getting it right the first time. Track sub-agent pass rates per model tier and adjust thresholds accordingly.
- The orchestrator always reviews with the same (high) model regardless of which model produced the code.

### Local agent dispatch (Aider + Ollama)

A Mac Studio on the LAN serves `qwen2.5-coder:14b` via Ollama with 3 parallel inference slots. Aider agents run in git worktrees on the MacBook, hitting the Mac Studio for inference. See `mac-studio-local-llm-agent-host.md` for infrastructure details and `dispatch.sh` for the tmux-based runner.

**When to use local agents instead of API sub-agents:**

- The task is well-scoped to 1–3 files with no ambiguity.
- There are 2+ independent tasks that benefit from true parallelism (local agents run simultaneously in worktrees; API sub-agents are sequential unless explicitly parallelized).
- The task is mechanical: writing tests to match an existing suite, adding CRUD for a new entity following an existing pattern, applying a known fix across files.
- Cost matters — local inference is free after hardware.

**When NOT to use local agents:**

- The task requires cross-module reasoning or understanding the full architecture.
- The task involves modifying shared interfaces (`lib/db/schema.ts`, `lib/db/index.ts`).
- The spec is ambiguous and the agent may need to make design decisions.
- The task requires tool use beyond file editing (running complex build pipelines, analyzing error logs, etc.).

#### Writing prompts for local agents

The 14B model is capable but has a narrow context window and no access to the broader codebase beyond the files you give it. Prompts must be **fully self-contained** — the agent cannot infer intent from project context.

**Required in every task prompt:**

1. **Exact file paths** to read and modify.
2. **The specific change** — not "add validation" but "add a `validateInput(data: CreateExperimentInput): string[]` function that checks: name is non-empty, variations.length >= 2, all weights sum to 100. Return an array of error strings, empty if valid."
3. **Existing patterns to follow** — paste a representative example (e.g., "follow the pattern in `createMetric()` which does X, Y, Z").
4. **Type signatures and interfaces** — paste the relevant types inline. Don't assume the agent will find them.
5. **A verification command** — e.g., "run `cd apps/web && npx tsc --noEmit` and fix any type errors, then run `npm run build`."

**Prompt anti-patterns (these cause local agent failures):**

- "Refactor the module to be cleaner" — too vague, no exit condition.
- "Update all references to X" — requires codebase-wide search the agent can't do.
- "Follow the existing conventions" without pasting an example — the agent may not find them.
- Tasks touching 4+ files — split into separate tasks instead.
- Asking the agent to make design choices ("pick the best approach") — decide in the plan.

#### Parallelization rules

The `dispatch.sh` script spawns agents in separate git worktrees, so they can't conflict at the filesystem level. But merge conflicts are still possible.

1. **File-disjoint tasks can always run in parallel.** If task A touches `components/Foo.tsx` and task B touches `components/Bar.tsx`, dispatch both.
2. **Shared-file tasks must be serialized** — or the first-merged branch creates rebase work for the second. The shared file boundaries in the Branching Guide apply here.
3. **Max 3 parallel tasks** with `qwen2.5-coder:14b` (matches `OLLAMA_NUM_PARALLEL=3`). Dispatching more queues them in Ollama, adding latency without throughput gain.
4. **Batch by dependency tier.** Dispatch all independent leaf tasks first, wait for completion, merge, then dispatch the next tier that depends on them.
5. **Keep tasks small enough to finish in one Aider pass.** A good local task takes 1–3 Aider interactions (edits + verification). If you expect the agent to iterate extensively, the task is too large — split it or escalate to a Sonnet sub-agent.
6. **Always review diffs before merging.** Local agents don't run `npm run build` reliably in non-interactive mode. The orchestrator should verify builds pass after merging each branch.

## Branching Guide for Agents

### Branch naming

Use `feat/<module-slug>` for feature work, `test/<module-slug>` for test-only branches:

```
feat/tag-filtering        # functional feature
test/db-layer             # unit tests for lib/db/
test/jest-setup           # test infrastructure
fix/srm-threshold         # bug fix
```

### Rules to minimize collisions

1. **One branch per module.** Each branch maps to exactly one TODO.md module or table row. Do not combine unrelated modules in a single branch.

2. **Claim before starting.** Mark the TODO.md task `[~]` with your branch name before writing code. If another agent already claimed it, pick a different task.

3. **Own your files.** Each branch should touch only the files listed in its TODO.md entry. If you need to modify a file owned by another in-flight branch, coordinate — don't edit it silently.

4. **Shared file boundaries:**
   - `lib/db/index.ts` — high contention. Only the branch that owns the relevant CRUD section should edit it. Add new exports; don't reorganize existing ones.
   - `lib/db/schema.ts` — additive changes only (new fields, new interfaces). Never rename or remove existing fields.
   - `components/index.ts` — append-only barrel exports. Add your line at the end.
   - `app/layout.tsx` — avoid unless your task explicitly requires it. Coordinate if two branches both need layout changes.
   - `package.json` — only the branch installing new deps should touch it. Run `npm install` after rebasing if another branch landed deps first.

5. **Rebase before PR.** Always `git fetch origin && git rebase origin/main` before opening a PR. Resolve conflicts in your branch, not in main.

6. **Keep branches short-lived.** Land and merge quickly. Long-lived branches accumulate drift and conflict risk.

7. **Test modules are naturally isolated.** Test branches (`test/*`) create new `__tests__/` directories and rarely conflict with each other or with feature branches. These are safe to parallelize.

### PR workflow

```bash
git checkout -b feat/my-module
# ... do work, commit ...
git fetch origin && git rebase origin/main
git push -u origin feat/my-module
gh pr create --base main --title "Add my-module" --body "..."
```

After merge, delete the remote branch (`gh pr merge --delete-branch` or `git push origin --delete feat/my-module`).
