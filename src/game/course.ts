import type { SpawnEntry } from "./types.ts";
import { TOTAL_SHARDS } from "./config.ts";

/** Authored collision times (when object reaches player). Deterministic. */
const BASE: SpawnEntry[] = [
  { id: "s01", atMs: 2800, kind: "SHARD", lane: 1 },
  { id: "h01", atMs: 5200, kind: "HAZARD", lane: 0 },
  { id: "s02", atMs: 7000, kind: "SHARD", lane: 0 },
  { id: "h02", atMs: 9000, kind: "HAZARD", lane: 2 },
  { id: "s03", atMs: 10800, kind: "SHARD", lane: 2 },
  { id: "s04", atMs: 14000, kind: "SHARD", lane: 1 },
  { id: "h03", atMs: 16500, kind: "HAZARD", lane: 1 },
  { id: "s05", atMs: 18800, kind: "SHARD", lane: 0 },

  { id: "s06", atMs: 22000, kind: "SHARD", lane: 2 },
  { id: "h04", atMs: 23500, kind: "HAZARD", lane: 0 },
  { id: "s07", atMs: 25000, kind: "SHARD", lane: 1 },
  { id: "h05", atMs: 26800, kind: "HAZARD", lane: 1 },
  { id: "s08", atMs: 26800, kind: "SHARD", lane: 0 },
  { id: "s09", atMs: 30000, kind: "SHARD", lane: 2 },
  { id: "h06", atMs: 32000, kind: "HAZARD", lane: 2 },
  { id: "h07", atMs: 33800, kind: "HAZARD", lane: 0 },
  { id: "s10", atMs: 35500, kind: "SHARD", lane: 1 },
  { id: "s11", atMs: 38500, kind: "SHARD", lane: 0 },
  { id: "h08", atMs: 40000, kind: "HAZARD", lane: 1 },
  { id: "s12", atMs: 42000, kind: "SHARD", lane: 2 },

  { id: "h09", atMs: 46000, kind: "HAZARD", lane: 0 },
  { id: "s13", atMs: 47500, kind: "SHARD", lane: 1 },
  { id: "h10", atMs: 49200, kind: "HAZARD", lane: 2 },
  { id: "s14", atMs: 51000, kind: "SHARD", lane: 0 },
  { id: "h11", atMs: 52800, kind: "HAZARD", lane: 1 },
  { id: "s15", atMs: 54600, kind: "SHARD", lane: 2 },
  { id: "h12", atMs: 56000, kind: "HAZARD", lane: 2 },
  { id: "h13", atMs: 57500, kind: "HAZARD", lane: 0 },
  { id: "s16", atMs: 59000, kind: "SHARD", lane: 1 },
  { id: "h14", atMs: 60500, kind: "HAZARD", lane: 1 },
  { id: "s17", atMs: 62000, kind: "SHARD", lane: 0 },
  { id: "s18", atMs: 64000, kind: "SHARD", lane: 2 },
  { id: "h15", atMs: 64000, kind: "HAZARD", lane: 1 },
];

export function validateCourse(entries: SpawnEntry[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const shards = entries.filter((e) => e.kind === "SHARD");
  if (shards.length !== TOTAL_SHARDS) errors.push(`expected ${TOTAL_SHARDS} shards, got ${shards.length}`);
  let prev = -1;
  for (const e of entries) {
    if (ids.has(e.id)) errors.push(`dup id ${e.id}`);
    ids.add(e.id);
    if (e.atMs < 0 || e.atMs > 65_000) errors.push(`${e.id} atMs out of range`);
    if (e.kind === "HAZARD" && e.atMs > 65_000) errors.push(`${e.id} hazard after portal`);
    if (![0, 1, 2].includes(e.lane)) errors.push(`${e.id} bad lane`);
    if (e.atMs < prev) errors.push(`${e.id} unsorted`);
    prev = e.atMs;
  }
  const first = shards.reduce((a, b) => (a.atMs < b.atMs ? a : b), shards[0]);
  if (first && first.atMs > 5000) errors.push("first shard after 5s");
  return errors;
}

export function courseForRun(runIndex: number): SpawnEntry[] {
  const mirror = runIndex % 2 === 1;
  return BASE.map((e) => ({
    ...e,
    lane: mirror ? ((2 - e.lane) as 0 | 1 | 2) : e.lane,
  }));
}

export const COURSE_ERRORS = validateCourse(BASE);
