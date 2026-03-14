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
- [ ] Write or verify integration tests / type contracts **before** dispatching implementation.
- [ ] After a sub-agent delivers, validate: builds pass, tests pass, only expected files changed.
- [ ] If a sub-agent's output fails validation, re-dispatch with the error context — don't patch it yourself silently.
- [ ] Update TODO.md status after merge (`[~]` → `[x]`).

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

**Rules of thumb:**

- Default to Sonnet for sub-agents. Escalate to Opus only if the task involves cross-module reasoning or underspecified requirements. Drop to Haiku for purely mechanical work.
- The tighter the dispatch prompt, the more reliably a lighter model executes. If you find a Haiku sub-agent failing, tighten the spec before upgrading the model.
- A failed-and-re-dispatched task costs more than getting it right the first time. Track sub-agent pass rates per model tier and adjust thresholds accordingly.
- The orchestrator always reviews with the same (high) model regardless of which model produced the code.

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
