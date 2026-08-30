export type GamePhase =
  | "BOOT"
  | "TITLE"
  | "COUNTDOWN"
  | "PLAYING"
  | "PAUSED"
  | "PORTAL_CHECK"
  | "SUCCESS"
  | "FAILURE"
  | "RESULT";

export type Lane = 0 | 1 | 2;
export type EntityKind = "SHARD" | "HAZARD";
export type OutcomeReason = "SHIELDS_DEPLETED" | "NOT_ENOUGH_SHARDS" | "SUCCESS" | null;
export type Grade = "S" | "A" | "B" | "C" | "D";

export interface SpawnEntry {
  id: string;
  atMs: number;
  kind: EntityKind;
  lane: Lane;
  speedMultiplier?: number;
}

export interface LiveEntity {
  id: string;
  kind: EntityKind;
  lane: Lane;
  z: number;
  atMs: number;
  resolved: boolean;
  visualT?: number;
}

export interface RunState {
  phase: GamePhase;
  elapsedMs: number;
  lane: Lane;
  targetLane: Lane;
  laneX: number;
  shards: number;
  shields: number;
  combo: number;
  score: number;
  invulnerableUntilMs: number;
  outcomeReason: OutcomeReason;
  runIndex: number;
  countdownMs: number;
  waveToastUntilMs: number;
  lastWave: number;
  missedShards: number;
  entities: LiveEntity[];
  spawnCursor: number;
}

export interface PersistentSettings {
  version: 1;
  bestScore: number;
  bestGrade: Grade | null;
  soundEnabled: boolean;
}

export interface GameFeedback {
  collect?: { id: string; points: number; combo: number };
  hit?: { id: string };
  miss?: { id: string };
  wave?: number;
  flash?: boolean;
}
