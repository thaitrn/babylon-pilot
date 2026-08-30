import type { GameFeedback, Lane, RunState, SpawnEntry } from "./types.ts";
import {
  DT_CLAMP_MS,
  ENTITY_HIT_RADIUS,
  INVULN_MS,
  LANE_SWITCH_MS,
  LANE_X,
  PASS_Z,
  PLAYER_HIT_RADIUS,
  PLAYER_Z,
  PORTAL_MS,
  RUN_MS,
  SPAWN_Z,
  TELEGRAPH_MS,
  waveAt,
} from "./config.ts";
import { applyCollect } from "./scoring.ts";
import { applyOutcome, enterPortalCheck, resolvePortal } from "./stateMachine.ts";

function easeOut(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) * (1 - x);
}

export function setTargetLane(state: RunState, lane: Lane): void {
  if (state.phase !== "PLAYING" && state.phase !== "PORTAL_CHECK" && state.phase !== "COUNTDOWN") return;
  state.targetLane = lane;
}

export function stepSimulation(
  state: RunState,
  course: SpawnEntry[],
  dtMsRaw: number,
): GameFeedback {
  const fb: GameFeedback = {};
  const dtMs = Math.min(Math.max(dtMsRaw, 0), DT_CLAMP_MS);

  if (state.phase === "COUNTDOWN") {
    state.countdownMs = Math.max(0, state.countdownMs - dtMs);
    lerpLane(state, dtMs);
    if (state.countdownMs <= 0) state.phase = "PLAYING";
    return fb;
  }

  if (state.phase !== "PLAYING" && state.phase !== "PORTAL_CHECK") return fb;

  state.elapsedMs = Math.min(state.elapsedMs + dtMs, RUN_MS);
  lerpLane(state, dtMs);

  const wave = waveAt(state.elapsedMs);
  if (wave !== state.lastWave) {
    state.lastWave = wave;
    state.waveToastUntilMs = state.elapsedMs + 1200;
    fb.wave = wave;
  }

  spawnDue(state, course);
  moveEntities(state, dtMs);
  collide(state, fb);

  if (state.phase === "PLAYING") enterPortalCheck(state);
  resolvePortal(state);
  return fb;
}

function lerpLane(state: RunState, dtMs: number): void {
  const targetX = LANE_X[state.targetLane];
  const remaining = targetX - state.laneX;
  if (Math.abs(remaining) < 0.001) {
    state.laneX = targetX;
    state.lane = state.targetLane;
    return;
  }
  const speed = (LANE_X[2] - LANE_X[0]) / LANE_SWITCH_MS;
  const step = Math.sign(remaining) * speed * dtMs * 2; // 2-lane width in LANE_SWITCH_MS? wait
  // Distance between adjacent lanes is 2. Cover 2 units in LANE_SWITCH_MS.
  const adjSpeed = 2 / LANE_SWITCH_MS;
  const move = Math.sign(remaining) * adjSpeed * dtMs;
  if (Math.abs(move) >= Math.abs(remaining)) {
    state.laneX = targetX;
    state.lane = state.targetLane;
  } else {
    state.laneX += move;
    const nearest = (Math.abs(state.laneX - LANE_X[0]) < Math.abs(state.laneX - LANE_X[1])
      ? (Math.abs(state.laneX - LANE_X[0]) < Math.abs(state.laneX - LANE_X[2]) ? 0 : 2)
      : (Math.abs(state.laneX - LANE_X[1]) < Math.abs(state.laneX - LANE_X[2]) ? 1 : 2)) as Lane;
    if (Math.abs(state.laneX - targetX) < 0.15) state.lane = state.targetLane;
    else state.lane = nearest;
  }
  void easeOut;
}

function spawnDue(state: RunState, course: SpawnEntry[]): void {
  while (state.spawnCursor < course.length) {
    const e = course[state.spawnCursor];
    const appearAt = e.atMs - TELEGRAPH_MS;
    if (state.elapsedMs < appearAt) break;
    if (e.kind === "HAZARD" && state.elapsedMs >= PORTAL_MS && e.atMs > PORTAL_MS) {
      state.spawnCursor++;
      continue;
    }
    state.entities.push({
      id: e.id,
      kind: e.kind,
      lane: e.lane,
      z: SPAWN_Z,
      atMs: e.atMs,
      resolved: false,
    });
    state.spawnCursor++;
  }
}

function moveEntities(state: RunState, _dtMs: number): void {
  void _dtMs;
  for (const ent of state.entities) {
    if (ent.resolved) continue;
    const remain = ent.atMs - state.elapsedMs;
    ent.z = (remain / TELEGRAPH_MS) * SPAWN_Z;
    if (ent.z < PASS_Z) {
      ent.resolved = true;
      if (ent.kind === "SHARD") {
        state.combo = 0;
        state.missedShards++;
      }
    }
  }
}

function collide(state: RunState, fb: GameFeedback): void {
  if (state.outcomeReason) return;
  const px = state.laneX;
  const pz = PLAYER_Z;
  const r = PLAYER_HIT_RADIUS + ENTITY_HIT_RADIUS;
  for (const ent of state.entities) {
    if (ent.resolved) continue;
    const ex = LANE_X[ent.lane];
    const dx = px - ex;
    const dz = pz - ent.z;
    if (dx * dx + dz * dz > r * r) continue;
    ent.resolved = true;
    if (ent.kind === "SHARD") {
      const next = applyCollect(state.score, state.combo);
      state.score = next.score;
      state.combo = next.combo;
      state.shards++;
      fb.collect = { id: ent.id, points: next.points, combo: next.combo };
    } else {
      if (state.elapsedMs < state.invulnerableUntilMs) continue;
      state.shields = Math.max(0, state.shields - 1);
      state.combo = 0;
      state.invulnerableUntilMs = state.elapsedMs + INVULN_MS;
      fb.hit = { id: ent.id };
      fb.flash = true;
      if (state.shields <= 0) {
        applyOutcome(state, "SHIELDS_DEPLETED", "FAILURE");
        return;
      }
    }
  }
}

export function simulateUntil(
  state: RunState,
  course: SpawnEntry[],
  untilMs: number,
  lanePlan?: (elapsed: number) => Lane,
): GameFeedback {
  const acc: GameFeedback = {};
  while (state.elapsedMs < untilMs) {
    if (state.phase === "FAILURE" || state.phase === "SUCCESS" || state.phase === "RESULT") break;
    if (lanePlan) setTargetLane(state, lanePlan(state.elapsedMs));
    const fb = stepSimulation(state, course, 16);
    if (fb.collect) acc.collect = fb.collect;
    if (fb.hit) acc.hit = fb.hit;
    if (state.phase !== "PLAYING" && state.phase !== "PORTAL_CHECK" && state.phase !== "COUNTDOWN") break;
  }
  return acc;
}
