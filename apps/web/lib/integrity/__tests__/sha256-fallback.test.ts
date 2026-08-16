import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { sha256Fallback } from "../sha256-fallback";

/**
 * `sha256Fallback` is the pure-JS digest used when `crypto.subtle` is
 * unavailable (insecure contexts — e.g. the dev server over plain HTTP on a
 * Tailscale address). Because locked-bet immutability is load-bearing, this
 * path has to agree with the real SHA-256 byte for byte: a fallback that
 * disagreed with `crypto.subtle` would silently break fingerprint
 * verification for anyone on the insecure path.
 *
 * Two oracles are used: hardcoded NIST vectors (independent of this machine)
 * and Node's own `crypto.createHash` (broad, cheap cross-validation).
 */

const enc = new TextEncoder();

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function nodeDigest(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

function digestOf(input: string | Uint8Array): string {
  return hex(sha256Fallback(typeof input === "string" ? enc.encode(input) : input));
}

describe("sha256Fallback — known-answer vectors", () => {
  it("hashes the empty input", () => {
    expect(digestOf("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it('hashes "abc"', () => {
    expect(digestOf("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("hashes the 56-byte multi-block vector", () => {
    // Exactly 56 bytes — forces a second padding block.
    const msg = "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq";
    expect(msg.length).toBe(56);
    expect(digestOf(msg)).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });
});

describe("sha256Fallback — output shape", () => {
  it("returns a 32-byte ArrayBuffer", () => {
    const out = sha256Fallback(enc.encode("abc"));
    expect(out).toBeInstanceOf(ArrayBuffer);
    expect(out.byteLength).toBe(32);
  });

  it("produces 64 lowercase hex characters", () => {
    expect(digestOf("abc")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic across repeated calls", () => {
    expect(digestOf("the fold-if is a single thread")).toBe(
      digestOf("the fold-if is a single thread"),
    );
  });
});

describe("sha256Fallback — parity with node:crypto across block boundaries", () => {
  // The padding maths (`(msgLen + 9 + 63) & ~63`) is where a hand-rolled
  // SHA-256 usually goes wrong, so sweep the lengths either side of each
  // 64-byte block boundary.
  const lengths = [
    0, 1, 2, 31, 32, 54, 55, 56, 57, 63, 64, 65, 111, 112, 119, 120, 127, 128,
    129, 191, 192, 255, 256, 1000,
  ];

  it.each(lengths)("matches node:crypto for a %i-byte message", (len) => {
    // Deterministic pseudo-random bytes — stable across runs, no seeding lib.
    const data = new Uint8Array(len);
    for (let i = 0; i < len; i++) data[i] = (i * 37 + 11) & 0xff;
    expect(digestOf(data)).toBe(nodeDigest(data));
  });
});

describe("sha256Fallback — byte handling", () => {
  it("matches node:crypto for every single-byte value", () => {
    for (let b = 0; b < 256; b++) {
      const data = Uint8Array.of(b);
      expect(digestOf(data)).toBe(nodeDigest(data));
    }
  });

  it("handles embedded NUL bytes without truncating", () => {
    const data = Uint8Array.of(0x61, 0x00, 0x62);
    expect(digestOf(data)).toBe(nodeDigest(data));
    // Distinct from the same bytes with the NUL removed.
    expect(digestOf(data)).not.toBe(digestOf(Uint8Array.of(0x61, 0x62)));
  });

  it("handles multi-byte UTF-8 text", () => {
    const data = enc.encode("naïve — 折り返し 🎲");
    expect(digestOf(data)).toBe(nodeDigest(data));
  });

  it("hashes over the view's contents, not the backing buffer", () => {
    // A Uint8Array that is a window into a larger buffer must hash as just
    // its own bytes.
    const backing = new Uint8Array([9, 9, 1, 2, 3, 9, 9]);
    const view = backing.subarray(2, 5);
    expect(digestOf(view)).toBe(digestOf(Uint8Array.of(1, 2, 3)));
  });
});

describe("sha256Fallback — sensitivity", () => {
  it("changes completely when a single bit flips", () => {
    const a = Uint8Array.of(0x00);
    const b = Uint8Array.of(0x01);
    const da = digestOf(a);
    const db = digestOf(b);
    expect(da).not.toBe(db);

    // Avalanche: expect far more than a handful of differing hex digits.
    const differing = Array.from(da).filter((ch, i) => ch !== db[i]).length;
    expect(differing).toBeGreaterThan(40);
  });

  it("distinguishes messages that differ only in length", () => {
    expect(digestOf("a")).not.toBe(digestOf("aa"));
    expect(digestOf("a".repeat(64))).not.toBe(digestOf("a".repeat(65)));
  });
});
