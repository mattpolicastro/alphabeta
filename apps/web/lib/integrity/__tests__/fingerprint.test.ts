import { describe, expect, it } from "vitest";
import { fingerprint, verifyFingerprint } from "../fingerprint";
import type { LockedSnapshot } from "@/lib/db/types";

const sample: LockedSnapshot = {
  articulation: {
    change: "swap the hero CTA",
    direction: "lift",
    metric: "checkout-start rate",
    magnitude: "8%",
    mechanism: "stronger verb increases salience",
    confidence: "fairly",
    foldIf: "less than 3% lift",
  },
  instrument: {
    type: "ab",
    overrideReason: null,
    feasibility: { mde: 0.03, runtimeDays: 14 },
  },
  criteria: {
    win: "ship to 100%",
    inconclusive: "extend or kill",
    loss: "revert",
    minMindChanger: "less than 3% lift",
    evidenceBar: "CI excludes 0 at 95%",
    runtime: 14,
  },
  lockedAt: "2026-06-03T18:00:00.000Z",
};

describe("fingerprint", () => {
  it("returns a 64-char lowercase hex string", async () => {
    const fp = await fingerprint(sample);
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — identical input yields identical output", async () => {
    const a = await fingerprint(sample);
    const b = await fingerprint(sample);
    expect(a).toBe(b);
  });

  it("is order-independent — key reordering at any nesting level does not change the hash", async () => {
    const reordered: LockedSnapshot = {
      lockedAt: sample.lockedAt,
      criteria: {
        evidenceBar: sample.criteria.evidenceBar,
        minMindChanger: sample.criteria.minMindChanger,
        loss: sample.criteria.loss,
        inconclusive: sample.criteria.inconclusive,
        win: sample.criteria.win,
        runtime: sample.criteria.runtime,
      },
      instrument: {
        feasibility: {
          runtimeDays: 14,
          mde: 0.03,
        },
        overrideReason: sample.instrument.overrideReason,
        type: sample.instrument.type,
      },
      articulation: {
        foldIf: sample.articulation.foldIf,
        confidence: sample.articulation.confidence,
        mechanism: sample.articulation.mechanism,
        magnitude: sample.articulation.magnitude,
        metric: sample.articulation.metric,
        direction: sample.articulation.direction,
        change: sample.articulation.change,
      },
    };
    expect(await fingerprint(reordered)).toBe(await fingerprint(sample));
  });

  it("is sensitive — any committed-field change produces a different hash", async () => {
    const base = await fingerprint(sample);

    const changedMagnitude = await fingerprint({
      ...sample,
      articulation: { ...sample.articulation, magnitude: "9%" },
    });
    expect(changedMagnitude).not.toBe(base);

    const changedFoldIf = await fingerprint({
      ...sample,
      articulation: { ...sample.articulation, foldIf: "less than 4% lift" },
    });
    expect(changedFoldIf).not.toBe(base);

    const changedInstrument = await fingerprint({
      ...sample,
      instrument: { ...sample.instrument, type: "quasi" },
    });
    expect(changedInstrument).not.toBe(base);

    const changedLockedAt = await fingerprint({
      ...sample,
      lockedAt: "2026-06-03T18:00:00.001Z",
    });
    expect(changedLockedAt).not.toBe(base);
  });

  it("is sensitive to nested feasibility changes", async () => {
    const base = await fingerprint(sample);
    const changedFeasibility = await fingerprint({
      ...sample,
      instrument: {
        ...sample.instrument,
        feasibility: { mde: 0.04, runtimeDays: 14 },
      },
    });
    expect(changedFeasibility).not.toBe(base);
  });
});

describe("verifyFingerprint", () => {
  it("returns true when the snapshot still hashes to the expected value", async () => {
    const fp = await fingerprint(sample);
    expect(await verifyFingerprint(sample, fp)).toBe(true);
  });

  it("returns false when the snapshot has been modified", async () => {
    const fp = await fingerprint(sample);
    const tampered: LockedSnapshot = {
      ...sample,
      articulation: { ...sample.articulation, magnitude: "9%" },
    };
    expect(await verifyFingerprint(tampered, fp)).toBe(false);
  });

  it("returns false on hash-string mismatch", async () => {
    expect(await verifyFingerprint(sample, "0".repeat(64))).toBe(false);
  });
});
