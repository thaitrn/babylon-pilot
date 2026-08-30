import type { Grade, PersistentSettings } from "./game/types";
import { STORAGE_KEY } from "./game/config";
import { betterGrade } from "./game/scoring";

const DEFAULTS: PersistentSettings = {
  version: 1,
  bestScore: 0,
  bestGrade: null,
  soundEnabled: true,
};

export function loadSettings(): PersistentSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw) as Partial<PersistentSettings>;
    if (p.version !== 1) return { ...DEFAULTS };
    const bestScore = Number.isFinite(p.bestScore) && (p.bestScore as number) >= 0 ? Math.floor(p.bestScore as number) : 0;
    const g = p.bestGrade;
    const bestGrade = g === "S" || g === "A" || g === "B" || g === "C" || g === "D" ? g : null;
    const soundEnabled = typeof p.soundEnabled === "boolean" ? p.soundEnabled : true;
    return { version: 1, bestScore, bestGrade, soundEnabled };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: PersistentSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* in-memory only */
  }
}

export function recordBest(s: PersistentSettings, score: number, grade: Grade): PersistentSettings {
  const next: PersistentSettings = {
    ...s,
    bestScore: Math.max(s.bestScore, score),
    bestGrade: betterGrade(s.bestGrade, grade),
  };
  saveSettings(next);
  return next;
}
