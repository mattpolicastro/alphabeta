# Task: Open experiment manifest format — schema, validator, GrowthBook adapter

**Package/repo name: `openexperiment`** (`mattpolicastro/openexperiment` on GitHub, unscoped `openexperiment` on npm — both verified free 2026-08-28). Mirrors the OpenFeature naming convention deliberately: OpenFeature is the runtime flag layer, this is the document layer above it. See "Relationship to OpenFeature and Confidence" below.

## Amendments — 2026-08-28

This revision corrects premises that drifted after the original was written, and adds two interop targets. Read these first; everything else is the original brief with the changes folded in.

1. **The AlphaBeta importer target has moved.** The original pointed at `apps/web/lib/db/types.ts` and a Dexie write. `apps/web` has since been demoted to a quarry (copy-and-adapt, not maintained — see `WORKLOG.md` 2026-08-16 → 08-25). The maintained model is the **event grammar** in `prototypes/graph-canvas/shape/event-grammar-v0.2.md` + `event-grammar-v0.3-addendum.md`. A manifest import is a `bet.locked` payload (its `instrument{type, spec}` field) or an evidence event — not a row. Requirement 4 is rewritten below.
2. **The instrument type list was wrong.** Original: `ab | quasi | observational | holdback | interviews`. The settled ladder (grammar v0.3) is `ab | quasi/holdback | study | prepost | none`, ordered by causal strength, where `none` is ship-and-watch (a rung, not an absence). The importer's discriminated union must match the ladder.
3. **Structured decision rules must not displace prose.** The grammar keeps `criteria.win/inconclusive/loss` as free-text commitments on purpose — the rubric's rule is *preserve the user's hedges verbatim*. Carry the structured `{ metric, direction, threshold, comparator }` form as a field **compiled at lock, derived from the prose**, with prose canonical. Same machine-checkability; the human register is never the optional field.
4. **Align assignment vocabulary to OpenFeature / Confidence**, not GrowthBook. `targetingKey` (their term) rather than `hashAttribute`; GB's name goes in passthrough. Adopt Confidence's assignment-table columns as a named profile so a manifest round-trips into their "analyze an experiment run elsewhere" flow. Details under Requirement 1.
5. **Local prerequisites on the Mac Studio.** `~/Projects/alphabeta-legacy` is **not** cloned on this machine. Clone it and fetch the extension branch explicitly: `git clone https://github.com/mattpolicastro/alphabeta-legacy ~/Projects/alphabeta-legacy && cd $_ && git fetch origin feat/extension-scaffold:feat/extension-scaffold`. Repo is archived; read-only is fine.
6. **The adapter is bidirectional and push is primary.** GB's public OpenAPI spec documents `POST /v1/experiments` and `GET /v1/experiments/{id}/results`. The bet-first flow — lock in AlphaBeta, create the platform experiment from the manifest — is buildable now, and the results endpoint is no longer unknown. See Requirement 3.
7. **GrowthBook fixtures gate value semantics, not the mapping.** The results mapping is written against the published schema; one captured fixture from a live instance is still needed to confirm what the numbers mean. No capture instance is confirmed.

## Objective

Produce a new, standalone open format for describing product experiments, plus a reference implementation. When this task is done there should be: (1) a versioned JSON Schema for the manifest, (2) a validator that reports which profile a document satisfies rather than a bare pass/fail, (3) a GrowthBook adapter that creates a platform experiment *from* a manifest and reads one back into a manifest, and (4) an importer that consumes manifest documents into AlphaBeta's event grammar. The format is intended as a utility layer and interoperability surface across experimentation platforms — it is not AlphaBeta-specific and must be usable by someone who has never heard of AlphaBeta.

Deliver this as its own repo/package, not buried inside `apps/web`. It should be publishable and permissively licensed.

## Relationship to OpenFeature and Confidence (verified 2026-08-28)

**OpenFeature** (CNCF) standardizes flag *evaluation* and, since the Tracking API, event *emission* — `track(eventName, context, details)`, whose stated purpose is "to facilitate experimentation and analysis of the impact of feature flags on business objectives." The spec explicitly does not define experiments, variations, metrics, results, or analysis; it emits raw events and delegates everything else to the provider. It standardizes the two ends of the pipe — which variant a user got, what they then did — and has no concept of the experiment as a designed, described, resolvable object.

**Confidence** (Spotify, `confidence.spotify.com`) is the most OpenFeature-native platform: warehouse-native, Confidence is a provider behind the OpenFeature API. Its "analyze an experiment run elsewhere" flow — the closest thing in the market to a results-only import — takes **warehouse tables only, no file format**. Its contract is four columns (`experiment_id`, `variation_id`, `visitor_id`, `timestamp`); its native assignment table is `assignment_time`, `targeting_key`, `targeting_key_selector`, `flag`, `rule`, `variant`, `assignment_id` (+ optional `resolve_id`, `client`, `client_credential`, `segment`, `default_assignment_reason`). Note the subtlety: `assignment_id` is the variant *key*, distinct from `variant`, because fall-through variants can share assignments. Its hypothesis model is a structured template (treatment / population / expected change / success metric / MDE) with guidance to "define the decision rule for a successful experiment upfront," including non-inferiority margins on guardrails — but nothing locks, hashes, or checks it. API reference and OpenAPI spec are login-gated; not an emitter target yet.

So: **nothing in the market describes the experiment; OpenFeature deliberately stops at the flag, and Confidence stops at the exposure row.** Put that in the README nearly verbatim. The manifest's `design.variations` map onto OpenFeature flag variants; its `metrics` catalog names the `track()` events analysis reads; its assignment section speaks Confidence's column vocabulary.

## Context

Prior art in the existing codebases. Three formats already exist and none of them is the manifest. Read all three before designing:

* `mattpolicastro/alphabeta-legacy` @ `main` — `apps/web/lib/db/schema.ts`. `Experiment` / `Metric` / `Variation`. The closest thing to an experiment config today; a loose extension of GrowthBook's shape. Worked instance at `apps/web/public/demo/demo-experiment.json`.
* `mattpolicastro/alphabeta-legacy` @ `feat/extension-scaffold` — `apps/extension/src/types/scraped.ts` (`ScrapedExperiment` + `isScrapedExperiment` runtime guard), `apps/extension/src/scrapers/growthbook/types.ts` (`GBExperimentDef`, verified against GB cloud 2026-04-08), and `extension-requirements.md` §5 (the type contract and the GB→Scraped mapping table). This is the only existing format spanning both design and results, and is the natural skeleton.
* `mattpolicastro/alphabeta` @ `main` — the **event grammar** (`prototypes/graph-canvas/shape/event-grammar-v0.2.md`, `-v0.3-addendum.md`) is the maintained model. `apps/web/lib/db/types.ts` (the pre-pivot `Bet`), `apps/web/lib/db/portable.ts` (export envelope with a version contract and a stubbed migration chain), and `apps/web/lib/integrity/fingerprint.ts` are reference patterns, not targets.

Key architectural decision: Experiment is NOT nested inside Bet. This was considered and rejected. Reasons:

* Cardinality is many-to-many. A sequence bet spans several experiments, and one A/B test can resolve several bets (multi-arm, or separate bets on separate metrics). Containment fails in both directions.
* Nesting makes the format unadoptable by anyone who hasn't bought into AlphaBeta's discipline layer. GrowthBook, Statsig, Optimizely, and Confidence all emit experiment definitions and none of them have a Bet concept.
* The experiment config on the platform side keeps mutating after a bet is locked (metrics added, weights changed, runtime extended). Nesting freezes a copy that silently diverges. Referencing lets you store a pointer plus a design hash at lock time and diff on resolution — which gives the existing `guide_drift` and `deviation` flags an actual mechanism, since they currently have none.

So: the manifest is the standalone document. The bet references it. Target shape:

```
ExperimentManifest        // standalone, portable, GB/Confidence-compatible
  ├─ design               // variations, weights, assignment
  ├─ metrics              // catalog
  └─ results?             // per-variation aggregates

bet.locked.instrument     // grammar v0.3 — the union is keyed by ladder rung
  ├─ type: "ab"
  └─ spec:
       ├─ ref: manifestId
       ├─ designHashAtLock: sha256   // drift detection
       └─ precedence: "bet-first" | "experiment-first"
```

Design lessons borrowed from ISA-Tab / ISA-JSON (life-sciences experimental metadata framework; the closest mature precedent). Apply all four:

1. Abstract model separate from serialization. ISA's own paper is explicit that the ISA data model is not a model of ISA-Tab — ISA-Tab is one implementation of it. They also document the leak that happens when you don't separate them: ISA-Tab table filenames aren't part of the model but had to enter the class model to support serialization. Do not let TypeScript interfaces serve as both spec and wire format. The JSON Schema is the spec; TS types are generated from or validated against it.
2. Three-tier hierarchy with one-to-many joins. ISA uses Investigation (project context) → Study (unit of research) → Assay (measurement). Consider the analogous split rather than a flat document.
3. Ontology-annotation pattern for controlled vocabularies. ISA qualifies fields with a term plus a reference to a declared source vocabulary, which is what lets you search across documents from different producers. Use this to stop the metric-taxonomy fight (see Requirements).
4. Profile-based validation. ISA validates against a configuration, not the spec alone. Partial population must be legal.

Every incumbent's moat is migration friction. There is no format to defer to and no established emitter to copy.

## Requirements

### 1. The schema

* JSON Schema, versioned, with an explicit `manifestVersion` field. Follow `portable.ts`'s precedent: reject documents newer than the implementation supports, with a migration chain stubbed for older ones. Set `$id` to a stable URL on day one — cheap now, painful later.
* Three sections — design, metrics, results — where results is optional. Design-only (pre-launch), design+results, and results-only (warehouse dump) are all legal documents.
* Restore assignment fields. These are absent from every existing format and are the largest gap versus GrowthBook. At minimum, as optional passthrough: `trackingKey`, **`targetingKey`** (OpenFeature/Confidence term; GB's `hashAttribute` maps to it, GB's name goes in passthrough), `coverage`, `namespace`, targeting conditions, phases, feature-flag linkage. Without them the manifest cannot round-trip a GB experiment.
* **Confidence assignment profile.** Define a named sub-profile of the assignment/exposure section that carries Confidence's columns — `assignment_time`, `targeting_key`, `targeting_key_selector`, `flag`, `rule`, `variant`, `assignment_id` — with `assignment_id` modeled as the variant key separately from `variant`. A manifest satisfying this profile should be projectable to their external-experiment table with no lossy mapping.
* Namespaced identity. Bare string ids like `metrics[].id` are only meaningful inside one platform. Use `{ platform, instanceId, nativeId }` or a URI so two producers' documents can coexist in one store.
* Namespaced passthrough block. Anything not modeled must survive a round trip — `x-growthbook: {...}` or similar. Emit → import → emit must be non-destructive. Currently-unmapped GB fields to park there: `uid`, `organization`, `project`, `owner`, `status`, `archived`, `secondaryMetrics`, `activationMetric`, `variations[].screenshots`, `variations[].dom`.
* Metric type: carry both. Three incompatible taxonomies exist today — `binomial|count|revenue|continuous` (legacy schema.ts), `proportion|continuous` (stats/types.ts), `binomial|continuous` (scraped.ts). Do not pick one. Carry a semantic `type` as an annotated term (`{ term, source }` per the ISA pattern) plus a derived `statisticalType` that the stats layer consumes.
* **Metrics vocabulary: adopt Confidence's metrics-as-code schema as the first declared source.** `spotify/confidence-metrics-sync` publishes a JSON Schema at `https://confidence.dev/schemas/metrics/v1` with a three-tier model — `fact_table` (source + entity mappings + measures) → `measurement` (one aggregation: measure × operation, or numerator/denominator for ratios; filters, cap, quantile, null handling) → `metric` (a measurement plus `preferred_direction`, `default_effect_size`, `measurement_window`, `variance_reduction`). That is the ISA three-tier lesson already in production. Use its names where the manifest overlaps: `preferred_direction: increase|decrease` (replaces `higherIsBetter`), `measurement_window: { type: closed|semi_open|open, aggregation_window, exposure_offset }`, `entity`, aggregation ops `sum|count|count_distinct|avg|max|min`. A manifest metric whose `type.source` is that `$id` is directly projectable to their format. Do not model fact tables — the manifest describes *which* metrics an experiment commits to, not how a warehouse computes them; carry a `definitionRef` that can point at a Confidence metric resource name (`metrics/…`) or any other producer's id.
* Adopt the fingerprint. Port the canonical-JSON SHA-256 approach from `lib/integrity/fingerprint.ts` (recursive key sorting, then hash) as a spec'd operation over a declared committed-fields subset, with `previousVersionId` lineage. Tamper-evident pre-registration with no server is rare in this space and cheap to specify.
* Structured decision rules, **prose-canonical**. Specify a `{ metric, direction, threshold, comparator }` form as a *compiled* field alongside a required prose field. The prose is what the author committed to and is preserved verbatim; the structured form is derived at lock so resolution is machine-checkable. Confidence's guidance ("define the decision rule upfront," non-inferiority margins on guardrails) is the shape to match; the difference is that here it is locked and hashed.
* Use MUST/SHOULD language properly in the spec prose. Require the joins; leave the leaves optional.

### 2. The validator

* Reports which profile a document satisfies, not pass/fail. Profiles at minimum: `design`, `design+results`, `results`, plus `assignment:confidence` as an orthogonal sub-profile.
* Do not repeat `isScrapedExperiment`'s mistake of hard-requiring `diagnostics.srm` — that rejects a perfectly good pre-launch definition.
* Ship it as the reference implementation; other producers should be able to check their output against it.

### 3. The GrowthBook adapter — bidirectional, push is the primary direction

**Verified 2026-08-28 against GrowthBook's published OpenAPI spec** (`packages/back-end/generated/spec.yaml` in `growthbook/growthbook`, public). The bet-first flow — lock in AlphaBeta, *then* create the experiment on the platform from the manifest — is the product's primary direction, and GB supports it:

* **Push (manifest → GB): `POST /v1/experiments`.** Required body: `trackingKey`, `name`, `variations[]`. Accepts `hypothesis`, `metrics[]`, `secondaryMetrics[]`, `guardrailMetrics[]`, `activationMetric`, `hashAttribute`, `fallbackAttribute`, `phases[]` (`coverage`, `namespace`, `variationWeights`, `targetingCondition`, `savedGroupTargeting`), `statsEngine`, `sequentialTestingEnabled`, `regressionAdjustmentEnabled`. Lifecycle via `POST /v1/experiments/{id}/start` and `/stop`; `POST /v1/experiments/{id}` updates. Every design-section field has a documented destination; the adapter records the returned `id` into the manifest's namespaced identity.
* **Pull (GB → manifest): `GET /v1/experiments/{id}`** for design, and **`GET /v1/experiments/{id}/results`** for results — the endpoint the original brief said nobody had handled *is in the public spec*. Shape: `result.results[].{dimension, totalUsers, checks.srm, metrics[].variations[].{users, analyses[].{engine, numerator, denominator, mean, stddev, percentChange, effectStandardError, ciLow, ciHigh, pValue, risk, chanceToBeatControl}}}`. `POST /v1/experiments/{id}/snapshot` triggers a fresh analysis.
* **GB's own decision layer** — `decisionFrameworkSettings.{decisionCriteriaId, decisionFrameworkMetricOverrides[].targetMDE}` on the way in, `resultSummary.{status, winner, conclusions}` and `results: dnf|won|lost|inconclusive` on the way out — is advisory and editable, same as Confidence's. Carry it in `x-growthbook` so a bet's resolution can be reconciled against the platform's verdict.

Original notes, still applicable:

* Start from `extension-requirements.md` §5's mapping table, but treat it as unverified. `scrapers/growthbook/types.ts` carries a comment (dated 2026-04-08, GB cloud) noting that `/experiment/{id}` returns the definition only — no per-variation results. Every `result.dimensions[0]...` path in that table therefore depends on a second, never-handled endpoint (incremental-refresh / watchers / reports).
* Do not silently ship the guessed paths. The results mapping can now be written against the published schema above rather than §5's guesses; it still needs **one captured fixture** from a live instance to confirm value semantics (e.g. is `percentChange` relative or absolute, which `analyses[]` entry is the default engine). Until that fixture exists, mark the results mapping `verified-against-spec, unverified-against-data` in code and docs, and have the validator surface that flag. No capture instance is confirmed as of 2026-08-28.
* Other known-shaky items from that table: `variations[].isControl` derived from `index === 0` (GB convention, flagged "verify"), and `higherIsBetter` from `metric.inverse === false`.
* Ship as a subpath (`openexperiment/growthbook`), not a separate package, until a second adapter exists. Export both directions from it: `toGrowthBook(manifest) → CreateExperimentBody` and `fromGrowthBook(experiment, results?) → manifest`.

### 4. The AlphaBeta importer (rewritten)

* Target the **event grammar**, not `apps/web`. A manifest import produces the `instrument` field of a `bet.locked` payload: `{ type: "ab", spec: { ref, designHashAtLock, precedence } }`. `spec` is the discriminated union the original brief wanted in the `feasibility` hole; the grammar already keys it by ladder rung.
* Leave the union open for the other rungs — `quasi`/`holdback`, `study`, `prepost`, `none` — rather than special-casing `ab`. Only `ab` consumes a manifest today.
* **`bet-first` is the primary path**: the lock in AlphaBeta produces the manifest's design section (variants implied by the wager, metric + direction from the fold-if, MDE from sizing), and the adapter pushes it to the platform. `experiment-first` — a bet articulated after a test is already running — is the supported fallback with a weaker pre-registration guarantee; record `precedence` so projections can show which one applies.
* The importer is the only place AlphaBeta code touches the format package. Dependency direction stays AlphaBeta → `openexperiment`.
* Where this lands physically is an open question (the prototype is deliberately disposable; the grammar is the durable artifact). Ship the importer as a pure function `manifest → instrument` with tests, and leave wiring it into a surface for later.

## Constraints

* TypeScript. JSON Schema as the normative spec artifact.
* The format package must have no dependency on AlphaBeta code. Dependency direction is AlphaBeta → format, never the reverse.
* Do not migrate code from `feat/extension-scaffold`. `docs/handoff-2026-06-03.md` §6 already decided this: rewrite from spec, the data model has evolved.
* Permissive license (MIT or Apache-2.0), not CPAL.
* Do not build governance scaffolding — no consortium docs, no RFC process, no versioning policy beyond the schema's own version field. The decision is to publish a useful format and let "standard" be an outcome, not a goal. The `open*` name is aspiration, not a promise; the README should lead with "a manifest format."

## Files & Paths

* New repo: `~/Projects/openexperiment/` → `mattpolicastro/openexperiment`.
* `~/Projects/alphabeta/` — the rewrite. `CLAUDE.md`, `WORKLOG.md`, `docs/handoff-2026-06-03.md` (§6 extension architecture, §7 stack, §11 open questions), `prototypes/graph-canvas/shape/event-grammar-v0.2.md` + `-v0.3-addendum.md` (the maintained model).
* `~/Projects/alphabeta-legacy/` — **must be cloned first** (see Amendment 5). Both branches; fetch `feat/extension-scaffold` explicitly.
* Existing test conventions: Vitest, colocated `__tests__/`, `vitest.config.ts`. Follow them.

## Acceptance Criteria

1. A GrowthBook experiment definition → manifest → back to GB-shaped JSON survives round-trip with no field loss (passthrough block does its job). Test with a captured fixture; **if no fixture exists, this criterion is explicitly deferred and the emitter is marked design-only.**
2. Validator returns `design` for a pre-launch document with no results section, and does not error.
3. Validator rejects a document whose `manifestVersion` exceeds the implementation's, with the version numbers in the error — same shape as `validateEnvelope`.
4. Fingerprint is stable across key reordering and whitespace, and changes when any committed field changes. Port the existing fingerprint tests.
5. A manifest with a structured decision rule can be evaluated against a results section programmatically — no prose parsing — **and the prose field is present and unchanged after evaluation.**
6. The format package builds and its tests pass with AlphaBeta absent from `node_modules`.
7. Every mapping in the GB emitter is either backed by a fixture or explicitly marked unverified in code and docs. No unmarked guesses.
8. `toGrowthBook(manifest)` produces a body that validates against the `POST /v1/experiments` schema in GB's OpenAPI spec, and `fromGrowthBook(toGrowthBook(m))` preserves every design field of `m`. Test against the spec file, not a live instance.
9. A manifest satisfying the `assignment:confidence` profile projects to Confidence's assignment-table columns with no lossy mapping. Test with a synthetic table.
10. `manifest → instrument` importer returns a `bet.locked`-shaped `instrument` for `type: "ab"` and records `precedence`.

## Notes

Suggested order: (1) clone legacy, read all three prior formats and the ISA-JSON spec structure at `isa-specs.readthedocs.io`; (2) draft the JSON Schema; (3) validator + profiles; (4) fingerprint port; (5) GB adapter — push direction first (`toGrowthBook`, validated against the spec), then pull; (6) importer as a pure function; (7) results value-semantics confirmed once one fixture exists.

The first clean cut is **the format package alone** — repo, schema, validator, fingerprint. It has no dependency on GB access, on AlphaBeta, or on the importer; acceptance criteria 2–6 and 9 all live there.

Gotcha: the results-side GB mapping is the single largest risk in this task. It is unverified, it needs an endpoint nobody has handled, and getting it wrong produces plausible numbers that are silently incorrect. Prefer emitting nothing over emitting a guess.

Reference: ISA's JSON schemas live in the isatools repo under `isatools/resources/schemas/`; the spec structure and MUST/SHOULD conventions are at `isa-specs.readthedocs.io`. Worth reading `isajson.html` specifically before drafting. OpenFeature Tracking API: `openfeature.dev/specification/sections/tracking`. Confidence assignment tables: `confidence.spotify.com/docs/metrics/assignment-tables`; external analysis: `.../docs/experiments/workflows/analysis`.

```bash
# Interactive
cd ~/Projects/alphabeta && claude

# Non-interactive
cc-run ~/Projects/alphabeta "$(cat docs/handoff-experiment-manifest.md)"
```
