import type { GamePhase, OutcomeReason, RunState } from "./types.ts";
import { COUNTDOWN_MS, LANE_X, PORTAL_MS, RUN_MS, START_SHIELDS, TARGET_SHARDS } from "./config.ts";

const ALLOWED: Record<GamePhase, GamePhase[]> = {
  BOOT: ["TITLE"],
  TITLE: ["COUNTDOWN"],
  COUNTDOWN: ["PLAYING"],
  PLAYING: ["PAUSED", "FAILURE", "PORTAL_CHECK"],
  PAUSED: ["PLAYING"],
  PORTAL_CHECK: ["SUCCESS", "FAILURE"],
  SUCCESS: ["RESULT"],
  FAILURE: ["RESULT"],
  RESULT: ["COUNTDOWN"],
};

export function canTransition(from: GamePhase, to: GamePhase): boolean {
  return ALLOWED[from].includes(to);
}

export function freshRun(runIndex: number): RunState {
  return {
    phase: "COUNTDOWN",
    elapsedMs: 0,
    lane: 1,
    targetLane: 1,
    laneX: LANE_X[1],
    shards: 0,
    shields: START_SHIELDS,
    combo: 0,
    score: 0,
    invulnerableUntilMs: 0,
    outcomeReason: null,
    runIndex,
    countdownMs: COUNTDOWN_MS,
    waveToastUntilMs: 0,
    lastWave: 1,
    missedShards: 0,
    entities: [],
    spawnCursor: 0,
  };
}

export function titleState(): RunState {
  const s = freshRun(0);
  s.phase = "TITLE";
  return s;
}

export function portalOutcome(state: RunState): OutcomeReason {
  if (state.shards >= TARGET_SHARDS && state.shields > 0) return "SUCCESS";
  return "NOT_ENOUGH_SHARDS";
}

export function applyOutcome(state: RunState, reason: OutcomeReason, next: GamePhase): void {
  if (state.outcomeReason) return;
  if (!canTransition(state.phase, next) && state.phase !== "PORTAL_CHECK") return;
  state.outcomeReason = reason;
  state.phase = next;
}

export function enterPortalCheck(state: RunState): void {
  if (state.phase !== "PLAYING") return;
  if (state.elapsedMs < PORTAL_MS) return;
  state.phase = "PORTAL_CHECK";
}

export function resolvePortal(state: RunState): void {
  if (state.phase !== "PORTAL_CHECK") return;
  if (state.elapsedMs < RUN_MS) return;
  const reason = portalOutcome(state);
  state.outcomeReason = reason;
  state.phase = reason === "SUCCESS" ? "SUCCESS" : "FAILURE";
}
