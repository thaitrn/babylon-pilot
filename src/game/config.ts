export const RUN_MS = 70_000;
export const PORTAL_MS = 65_000;
export const TARGET_SHARDS = 12;
export const TOTAL_SHARDS = 18;
export const START_SHIELDS = 3;
export const INVULN_MS = 1_200;
export const LANE_SWITCH_MS = 200;
export const COUNTDOWN_MS = 3_000;
export const DT_CLAMP_MS = 50;
export const HITBOX_SCALE = 0.85;
export const PLAYER_HIT_RADIUS = 0.55 * HITBOX_SCALE;
export const ENTITY_HIT_RADIUS = 0.45 * HITBOX_SCALE;
export const LANE_X = [-2, 0, 2] as const;
export const SPAWN_Z = 42;
export const PLAYER_Z = 0;
export const PASS_Z = -4;
export const TELEGRAPH_MS = 1_400;
export const STORAGE_KEY = "babylon-pilot:v1";
export const WAVE_SPEED = [1, 1.15, 1.3] as const;
export const BASE_FORWARD = SPAWN_Z / (TELEGRAPH_MS / 1000);

export function waveAt(elapsedMs: number): 1 | 2 | 3 {
  if (elapsedMs < 20_000) return 1;
  if (elapsedMs < 45_000) return 2;
  return 3;
}

export function speedAt(elapsedMs: number): number {
  return WAVE_SPEED[waveAt(elapsedMs) - 1];
}
