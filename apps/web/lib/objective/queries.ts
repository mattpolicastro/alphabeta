// Dexie-backed query layer for the Objective entity. Mirrors the bet/queries
// shape: mint / get / list / update. Delete is intentionally omitted in v1 —
// orphaning bets linked to a deleted objective is a bug surface we'll tackle
// when there's a real use case for removing objectives.

import type { Framework, Objective } from "@/lib/db/types";
import { getDb } from "@/lib/db";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `obj-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyObjective(id: string, now: string): Objective {
  return {
    id,
    ownerId: null,
    title: "",
    metric: "",
    target: { start: 0, goal: 0 },
    framework: "NSF",
    tag: "",
    createdAt: now,
    updatedAt: now,
  };
}

type ObjectiveSeed = Partial<
  Pick<Objective, "title" | "metric" | "target" | "framework" | "tag">
>;

export async function mintObjective(seed: ObjectiveSeed = {}): Promise<Objective> {
  const now = new Date().toISOString();
  const obj = emptyObjective(newId(), now);
  if (seed.title !== undefined) obj.title = seed.title;
  if (seed.metric !== undefined) obj.metric = seed.metric;
  if (seed.target !== undefined) obj.target = seed.target;
  if (seed.framework !== undefined) obj.framework = seed.framework;
  if (seed.tag !== undefined) obj.tag = seed.tag;
  await getDb().objectives.add(obj);
  return obj;
}

export async function getObjective(id: string): Promise<Objective | undefined> {
  return getDb().objectives.get(id);
}

export async function listObjectives(): Promise<Objective[]> {
  return getDb()
    .objectives.orderBy("updatedAt")
    .reverse()
    .toArray();
}

export async function updateObjective(
  id: string,
  patch: Partial<
    Pick<Objective, "title" | "metric" | "target" | "framework" | "tag">
  >,
): Promise<void> {
  const existing = await getDb().objectives.get(id);
  if (!existing) throw new Error(`Objective not found: ${id}`);
  await getDb().objectives.update(id, {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

export const FRAMEWORKS: Framework[] = ["NSF", "RICE", "GPS", "OKR", "GIST"];
