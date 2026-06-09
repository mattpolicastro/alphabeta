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

// crypto.subtle is only available in secure contexts (HTTPS / localhost).
// Tailnet or LAN addresses over plain HTTP fall back to a JS implementation.
async function sha256(data: Uint8Array): Promise<ArrayBuffer> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    return crypto.subtle.digest("SHA-256", data as Uint8Array<ArrayBuffer>);
  }
  // Fallback: manual SHA-256 for insecure contexts (e.g. Tailscale HTTP)
  const { sha256Fallback } = await import("./sha256-fallback");
  return sha256Fallback(data);
}

export async function fingerprint(snapshot: LockedSnapshot): Promise<string> {
  const canonical = JSON.stringify(canonicalize(snapshot));
  const data = new TextEncoder().encode(canonical);
  const hash = await sha256(data);
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
