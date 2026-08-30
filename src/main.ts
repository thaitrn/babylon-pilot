import { Engine } from "@babylonjs/core";
import type { Lane, RunState, SpawnEntry } from "./game/types";
import { COUNTDOWN_MS, DT_CLAMP_MS } from "./game/config";
import { courseForRun, COURSE_ERRORS } from "./game/course";
import { freshRun, titleState } from "./game/stateMachine";
import { setTargetLane, stepSimulation } from "./game/simulation";
import { laneFromClientX, stepLane } from "./game/input";
import { gradeFor } from "./game/scoring";
import { loadSettings, recordBest, saveSettings } from "./storage";
import { mountHud, renderHud } from "./ui/hud";
import { createGameScene, resetPool, syncEntities, type SceneKit } from "./scene/createScene";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const uiHost = document.getElementById("ui") as HTMLElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const testHook = ((window as unknown as { __bgTest: Record<string, unknown> }).__bgTest ||= {});
const pageErrors: string[] = [];
window.addEventListener("error", (e) => pageErrors.push(String(e.message)));

let engine: Engine;
let kit!: SceneKit;
let settings = loadSettings();
let state: RunState = titleState();
let course: SpawnEntry[] = courseForRun(0);
let runIndex = 0;
let impulse = 0;
let pointerHeld = false;
let audioCtx: AudioContext | null = null;
let outcomeSettled = false;
let outcomeHold = 0;

function snapshot() {
  Object.assign(testHook, {
    ready: true,
    engine: testHook.engine,
    phase: state.phase,
    elapsedMs: state.elapsedMs,
    lane: state.lane,
    targetLane: state.targetLane,
    shards: state.shards,
    shields: state.shields,
    combo: state.combo,
    score: state.score,
    outcomeReason: state.outcomeReason,
    fpsSamples: testHook.fpsSamples,
    pageErrors,
    runIndex,
  });
}

function beep(freq: number, dur: number, type: OscillatorType = "sine") {
  if (!settings.soundEnabled || !audioCtx) return;
  try {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0.05;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  } catch { /* ignore */ }
}

function unlockAudio() {
  if (!audioCtx) {
    try { audioCtx = new AudioContext(); } catch { audioCtx = null; }
  }
  audioCtx?.resume().catch(() => undefined);
}

const hud = mountHud(uiHost);
renderHud(hud, state, settings, reduced);

function startRun() {
  unlockAudio();
  runIndex += 1;
  course = courseForRun(runIndex);
  state = freshRun(runIndex);
  state.phase = "COUNTDOWN";
  state.countdownMs = COUNTDOWN_MS;
  resetPool(kit);
  outcomeHold = 0;
  outcomeSettled = false;
}

function retry() {
  startRun();
}

hud.startBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (state.phase === "TITLE") startRun();
});
hud.retryBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (state.phase === "RESULT") retry();
});
hud.muteBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  settings = { ...settings, soundEnabled: !settings.soundEnabled };
  saveSettings(settings);
  unlockAudio();
});
hud.resumeBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (state.phase === "PAUSED") state.phase = "PLAYING";
});

function bindPlayInput() {
  const onPoint = (ev: PointerEvent) => {
    if (state.phase === "TITLE" && ev.type === "pointerdown") return;
    if (state.phase === "RESULT" || state.phase === "PAUSED") return;
    const t = ev.target as HTMLElement;
    if (t.closest && t.closest(".card, .cta, .mute, .pause-layer, button")) return;
    if (state.phase !== "PLAYING" && state.phase !== "PORTAL_CHECK" && state.phase !== "COUNTDOWN") return;
    setTargetLane(state, laneFromClientX(ev.clientX, window.innerWidth));
  };
  window.addEventListener("pointerdown", (e) => {
    pointerHeld = true;
    onPoint(e);
  });
  window.addEventListener("pointermove", (e) => {
    if (pointerHeld) onPoint(e);
  });
  window.addEventListener("pointerup", () => { pointerHeld = false; });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      if (state.phase === "TITLE") startRun();
      else if (state.phase === "RESULT") retry();
      else if (state.phase === "PAUSED") state.phase = "PLAYING";
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      setTargetLane(state, stepLane(state.targetLane, -1));
    }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      setTargetLane(state, stepLane(state.targetLane, 1));
    }
  });
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden && (state.phase === "PLAYING" || state.phase === "PORTAL_CHECK")) {
    state.phase = "PAUSED";
  }
});

async function createEngine(): Promise<Engine> {
  const gpu = (navigator as Navigator & { gpu?: unknown }).gpu;
  if (gpu) {
    try {
      const attempt = (async () => {
        const e = new Engine(canvas, true, { antialias: true }, true);
        await (e as Engine & { _initAsync?: () => Promise<void> })._initAsync?.();
        return e;
      })();
      const t = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("wgpu timeout")), 2500));
      const e = await Promise.race([attempt, t]);
      testHook.engine = "WebGPU";
      return e;
    } catch { /* fall through */ }
  }
  const e2 = new Engine(canvas, true, { antialias: true });
  testHook.engine = "WebGL2 fallback";
  return e2;
}

function applyFb(fb: ReturnType<typeof stepSimulation>) {
  if (fb.collect) beep(880, 0.08);
  if (fb.hit) {
    impulse = reduced ? 0.02 : 0.12;
    beep(140, 0.18, "square");
    if (!reduced) {
      hud.flash.hidden = false;
      setTimeout(() => { hud.flash.hidden = true; }, 120);
    }
  }
}

function settleOutcome() {
  if (outcomeSettled) return;
  if (state.phase !== "SUCCESS" && state.phase !== "FAILURE") return;
  outcomeSettled = true;
  const g = gradeFor(state.outcomeReason, state.shards, state.shields);
  if (state.outcomeReason === "SUCCESS") {
    state.score += 500 + 200 * state.shields;
  }
  settings = recordBest(settings, state.score, g);
  outcomeHold = 800;
}

async function boot() {
  engine = await createEngine();
  kit = createGameScene(engine, reduced);

  engine.onContextLostObservable.add(() => {
    uiHost.insertAdjacentHTML("beforeend", '<div class="lost">Mất ngữ cảnh đồ họa. Tải lại trang.</div>');
  });

  bindPlayInput();

  Object.assign(testHook, {
    fpsSamples: [] as number[],
    actions: {
      start() { if (state.phase === "TITLE") startRun(); },
      setLane(n: Lane) { setTargetLane(state, n); },
      retry() { if (state.phase === "RESULT" || state.phase === "TITLE") retry(); },
      tick(ms: number) {
        const end = state.elapsedMs + ms;
        while (state.elapsedMs < end && state.phase !== "RESULT") {
          const fb = stepSimulation(state, course, 16);
          applyFb(fb);
          if (state.phase === "SUCCESS" || state.phase === "FAILURE") {
            settleOutcome();
            break;
          }
        }
      },
    },
  });

  let frames = 0, acc = 0;
  engine.runRenderLoop(() => {
    let dt = engine.getDeltaTime();
    if (!Number.isFinite(dt)) dt = 16;
    dt = Math.min(dt, DT_CLAMP_MS);
    if (state.phase === "COUNTDOWN" || state.phase === "PLAYING" || state.phase === "PORTAL_CHECK") {
      const fb = stepSimulation(state, course, dt);
      applyFb(fb);
    }
    if (state.phase === "SUCCESS" || state.phase === "FAILURE") settleOutcome();
    if ((state.phase === "SUCCESS" || state.phase === "FAILURE") && outcomeHold > 0) {
      outcomeHold -= dt;
      if (outcomeHold <= 0) state.phase = "RESULT";
    }
    impulse *= 0.85;
    syncEntities(kit, state, impulse, reduced);
    kit.scene.render();
    renderHud(hud, state, settings, reduced);
    snapshot();
    frames++;
    acc += engine.getDeltaTime();
    if (acc >= 500) {
      const fps = Math.round((frames * 1000) / acc);
      const samples = testHook.fpsSamples as number[];
      samples.push(fps);
      frames = 0;
      acc = 0;
    }
  });

  window.addEventListener("resize", () => engine.resize());
  testHook.ready = true;
  if (COURSE_ERRORS.length) console.warn("COURSE", COURSE_ERRORS);
}

boot().catch((err: unknown) => {
  const full = err instanceof Error ? (err.stack || err.message) : String(err);
  console.error("INIT_FAIL:", full);
  (window as unknown as { __initFail: string }).__initFail = full;
  pageErrors.push(full);
});
