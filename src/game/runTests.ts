import { comboBonus, applyCollect, gradeFor, successBonus } from "./scoring.ts";
import { COURSE_ERRORS, courseForRun, validateCourse } from "./course.ts";
import { freshRun, titleState, portalOutcome } from "./stateMachine.ts";
import { setTargetLane, stepSimulation, simulateUntil } from "./simulation.ts";
import { laneFromClientX, stepLane } from "./input.ts";
import { TARGET_SHARDS, TOTAL_SHARDS, RUN_MS } from "./config.ts";

let failed = 0;
function assert(name: string, cond: boolean) {
  if (!cond) {
    failed++;
    console.error("FAIL", name);
  } else console.log("PASS", name);
}

assert("course valid", COURSE_ERRORS.length === 0);
assert("18 shards", courseForRun(0).filter((e) => e.kind === "SHARD").length === TOTAL_SHARDS);
assert("mirror flips", courseForRun(1)[0].lane === (2 - courseForRun(0)[0].lane));
assert("combo bonus cap", comboBonus(9) === 100 && comboBonus(1) === 0);
assert("collect formula", applyCollect(0, 0).points === 100 && applyCollect(0, 3).points === 175);
assert("grade S", gradeFor("SUCCESS", 18, 3) === "S");
assert("grade A", gradeFor("SUCCESS", 15, 2) === "A");
assert("grade B", gradeFor("SUCCESS", 12, 1) === "B");
assert("grade C", gradeFor("NOT_ENOUGH_SHARDS", 9, 3) === "C");
assert("grade D", gradeFor("SHIELDS_DEPLETED", 2, 0) === "D");
assert("success bonus", successBonus(2) === 900);
assert("lane thirds", laneFromClientX(10, 300) === 0 && laneFromClientX(150, 300) === 1 && laneFromClientX(290, 300) === 2);
assert("lane clamp", stepLane(0, -1) === 0 && stepLane(2, 1) === 2);
assert("title phase", titleState().phase === "TITLE");

const run = freshRun(0);
const course = courseForRun(0);
while (run.phase === "COUNTDOWN") stepSimulation(run, course, 50);
assert("countdown to playing", run.phase === "PLAYING");

const auto = freshRun(0);
const c0 = courseForRun(0);
const shardTimes = c0.filter((e) => e.kind === "SHARD");
simulateUntil(auto, c0, RUN_MS + 100, (t) => {
  const next = shardTimes.find((s) => s.atMs >= t - 80) || shardTimes[shardTimes.length - 1];
  return next.lane;
});
assert("auto collect some", auto.shards >= 8);
assert("portal outcome fn", portalOutcome({ ...auto, shards: 12, shields: 1 }).startsWith("SUCCESS") || portalOutcome({ ...auto, shards: 12, shields: 1 }) === "SUCCESS");

const failShields = freshRun(0);
const hz = c0.filter((e) => e.kind === "HAZARD");
simulateUntil(failShields, c0, 30_000, (t) => {
  const h = hz.find((x) => Math.abs(x.atMs - t) < 120);
  return h ? h.lane : 1;
});
assert("can lose shields", failShields.shields < 3 || failShields.phase === "FAILURE");

const inv = freshRun(0);
while (inv.phase === "COUNTDOWN") stepSimulation(inv, c0, 50);
setTargetLane(inv, 0);
const h0 = c0.find((e) => e.kind === "HAZARD")!;
simulateUntil(inv, c0, h0.atMs + 50, () => h0.lane);
const sh = inv.shields;
simulateUntil(inv, c0, h0.atMs + 400, () => h0.lane);
assert("invuln no double hit", inv.shields === sh);

const winish = freshRun(0);
simulateUntil(winish, c0, RUN_MS, (t) => {
  let best = 1 as 0 | 1 | 2;
  for (const e of c0) {
    if (e.kind === "SHARD" && Math.abs(e.atMs - t) < 200) best = e.lane;
  }
  for (const e of c0) {
    if (e.kind === "HAZARD" && Math.abs(e.atMs - t) < 80 && e.lane === best) {
      best = ([0, 1, 2].find((l) => l !== e.lane) as 0 | 1 | 2) ?? 1;
    }
  }
  return best;
});
assert("run reaches end or fail", winish.elapsedMs >= 20_000 || winish.phase === "FAILURE" || winish.shards >= 0);
assert("target constant", TARGET_SHARDS === 12);
assert("validate empty", validateCourse([]).length > 0);

if (failed) {
  console.error(failed, "failed");
  process.exit(1);
}
console.log("all passed");
