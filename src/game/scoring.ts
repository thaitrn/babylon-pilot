import type { Grade, OutcomeReason } from "./types.ts";
import { START_SHIELDS, TOTAL_SHARDS } from "./config.ts";

export function comboBonus(comboAfterCollect: number): number {
  return 25 * Math.min(Math.max(comboAfterCollect - 1, 0), 4);
}

export function applyCollect(score: number, combo: number): { score: number; combo: number; bonus: number; points: number } {
  const nextCombo = combo + 1;
  const bonus = comboBonus(nextCombo);
  const points = 100 + bonus;
  return { score: score + points, combo: nextCombo, bonus, points };
}

export function successBonus(shields: number): number {
  return 500 + 200 * shields;
}

export function gradeFor(outcome: OutcomeReason, shards: number, shields: number): Grade {
  if (outcome === "SUCCESS") {
    if (shards >= TOTAL_SHARDS && shields >= START_SHIELDS) return "S";
    if (shards >= 15 && shields >= 2) return "A";
    return "B";
  }
  if (shards >= 9) return "C";
  return "D";
}

export function gradeRank(g: Grade | null): number {
  if (!g) return -1;
  return { D: 0, C: 1, B: 2, A: 3, S: 4 }[g];
}

export function betterGrade(a: Grade | null, b: Grade | null): Grade | null {
  return gradeRank(a) >= gradeRank(b) ? a : b;
}
