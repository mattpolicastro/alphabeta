# CLAUDE.md

## Project

A/B test analysis tool — static Next.js app with client-side IndexedDB and in-browser stats via Pyodide/WASM. See `architecture.md` for tech stack, directory layout, and conventions. See `requirements.md` (v1) and `requirements-v2.md` (v2) for product requirements. See `TODO.md` for task status.

## Build & Verify

```bash
cd apps/web && npm run build    # static export to out/; must pass before merging
npm test                        # once Jest is configured (see TODO.md Infrastructure)
```

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
