# openexperiment — how a manifest flows in and out

`openexperiment` is a portable JSON document describing one product experiment: its **design** (variants, allocation, targeting), its **metrics** catalog, and optionally its **results**. It is platform-neutral and has no AlphaBeta dependency. AlphaBeta is one consumer; GrowthBook and Confidence are the first producers/targets.

## The document

Three sections, results optional. A pre-launch design, a finished experiment, and a warehouse results dump are all valid documents — the validator reports *which* profile a document satisfies (`design`, `design+results`, `results`) rather than pass/fail.

```jsonc
{
  "manifestVersion": 1,
  "id": { "platform": "growthbook", "instanceId": "acme-prod", "nativeId": "exp_8f2a" },
  "design": {
    "hypothesis": "…",                       // prose, preserved verbatim
    "variations": [ { "key": "control", "weight": 0.5 }, { "key": "video", "weight": 0.5 } ],
    "assignment": { "targetingKey": "user_id", "coverage": 1.0, "namespace": null },
    "phases": [ { "start": "2026-09-01", "end": null } ],
    "decisionRules": [                        // compiled at lock, prose stays canonical
      { "prose": "win if signup rate rises ≥ 1pp",
        "metric": "signup_rate", "direction": "increase", "threshold": 0.01, "comparator": "gte" }
    ]
  },
  "metrics": [
    { "id": "signup_rate",
      "type": { "term": "binomial", "source": "growthbook" },   // producer's vocabulary
      "statisticalType": "proportion" }                          // what the stats layer consumes
  ],
  "results": null,
  "fingerprint": "sha256:…",                  // over the committed subset of design
  "previousVersionId": null,
  "x-growthbook": { "…": "anything not modeled, round-trips untouched" }
}
```

## Where manifests come from

| Source | How | Status |
|---|---|---|
| **GrowthBook** | adapter reads `GET /v1/experiments/{id}` (+ `/results`) into a manifest; GB-specific fields land in `x-growthbook` | both endpoints are in GB's public OpenAPI spec; results values still want one real fixture to confirm semantics |
| **Hand-authored** | write the JSON, run the validator | now |
| **Confidence** | their external-experiment flow is warehouse tables, not files; a manifest's assignment section uses their column names (`targeting_key`, `assignment_id`, `flag`, `rule`…) so a results-only manifest can be projected to their table shape | profile defined; no emitter (API is gated) |
| **AlphaBeta lab tools** | a sealed calculator result (sample size, MDE) can seed a design-only manifest | after lab ships |

## Where manifests go

**Into AlphaBeta — the lock.** When a bet is locked with `instrument.type = "ab"`, the lock stores a *reference* to the manifest plus a hash of its design at that moment:

```
bet.locked.instrument = { type: "ab", spec: { ref, designHashAtLock, precedence } }
```

The manifest is never copied into the bet. At resolution, the current manifest design is re-hashed and compared — a changed hash is **drift** (weights moved, metric added, runtime extended after commitment) and surfaces as a flag, with the diff. `precedence` records whether the bet was written before the experiment existed (`bet-first`, full pre-registration) or after it was already running (`experiment-first`, weaker guarantee, shown as such).

**Out to the platform — the primary direction.** A bet locked in AlphaBeta *produces* the manifest's design section (variants from the wager, metric and direction from the fold-if, MDE from sizing), and the adapter creates the experiment on the platform from it — `POST /v1/experiments` in GrowthBook, with the manifest hash recorded. The experiment is born from the commitment, not the other way round.

**Back from the platform.** Emit → import → emit is lossless: the passthrough block carries everything the format doesn't model, so a GB experiment survives a round trip through AlphaBeta with no field loss.

**Into client-facing artifacts.** Three things the manifest makes possible that the platforms don't:

1. **A sealed pre-registration** — the fingerprint is a canonical-JSON SHA-256 over the committed design fields, with `previousVersionId` lineage. Shareable as a receipt: "this is what we committed to, on this date, and here is the hash." No server needed.
2. **Machine-checkable resolution** — each decision rule has a compiled `{ metric, direction, threshold, comparator }` next to its prose, so a results section can be evaluated against the commitment programmatically. The prose is what the client wrote and is never altered.
3. **A drift report** — the design diff between lock and resolution, in the client's own terms (which metric was added, which weight moved), because both snapshots are the same document format.

## What it does not do

- It is not a stats engine — analysis stays on the platform or in AlphaBeta's lab.
- Results values from GrowthBook are mapped against the published schema but not yet confirmed against real data; the validator flags that state.
- It has no governance layer. It is a useful format first; "standard" is an outcome, not a goal.

Full build brief with acceptance criteria: `docs/handoff-experiment-manifest.md`.
