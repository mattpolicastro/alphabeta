import type { LockedSnapshot } from "@/lib/db/types";

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    out[key] = canonicalize(obj[key]);
  }
  return out;
}

export async function fingerprint(snapshot: LockedSnapshot): Promise<string> {
  const canonical = JSON.stringify(canonicalize(snapshot));
  const data = new TextEncoder().encode(canonical);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyFingerprint(
  snapshot: LockedSnapshot,
  expected: string,
): Promise<boolean> {
  return (await fingerprint(snapshot)) === expected;
}
