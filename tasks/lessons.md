# Lessons Learned

Preventive rules from past mistakes. Review at session start.

---

## Deploy & CI

### Always run `npm run build` locally before pushing
**Trigger:** 4 consecutive GitHub Pages deploy failures (2026-03-11) — each revealing a different missing file/dependency.
**Rule:** Before any `git push`, run `npm run build` in frontend/. If it fails locally, it will fail in CI. No exceptions.

### Always check `git status` for untracked files before pushing
**Trigger:** Components, hooks, utils, and package files were created locally but never staged. CI build failed on missing modules.
**Rule:** Run `git status` before every push. If there are untracked files in `src/`, they probably need to be committed.

### Commit static data files alongside the code that references them
**Trigger:** Frontend code referenced JSON files in `public/data/` that were never committed. Market Explorer showed 0 transactions in production.
**Rule:** When adding static data files, commit them in the same PR as the code that imports them. Never assume data files "will be added later."

---

## Code Patterns

### Apply fallback patterns consistently across all functions
**Trigger:** 6 of 8 functions in `marketApi.ts` had DEMO_MODE fallbacks, but 2 were missed. Those 2 showed "Sem dados" in production.
**Rule:** When a pattern (fallback, error handling, caching) applies to N functions, create a checklist of all N. Don't rely on memory — scan the file for all instances.

### Sort arrays before computing median
**Trigger:** Bug B9 — median calculation on unsorted array returned arbitrary middle element.
**Rule:** Always `.sort((a, b) => a - b)` before picking the middle element. Handle even-length arrays with average of two middle values.

### Use exact match before substring match for column detection
**Trigger:** Bug B4 — `"data" in "data_transacao"` matched before the correct column. Short candidate strings cause false positives.
**Rule:** Column mapping should use multi-pass: exact match first, then startswith, never loose substring.

### Wrap database connections in try/finally
**Trigger:** Bug B1 — `db.close()` was in the try body, not finally. Exception between open and close leaked the connection.
**Rule:** Every `await get_db()` must be followed by `try/finally` with `await db.close()` in the finally block.

---

## Naming & API

### Field names must match the computation
**Trigger:** Bug B19 — field named `medianPrecoM2` but computed with `AVG()` (mean, not median).
**Rule:** If you compute mean, name it mean/avg. If you compute median, name it median. Mismatch erodes trust in the data.

### Compare like with like (gross vs net)
**Trigger:** Bug B22 — gross rental income compared against net-of-tax CDI return. Made real estate look artificially better.
**Rule:** When comparing returns across asset classes, ensure both are on the same basis (both gross or both net).
