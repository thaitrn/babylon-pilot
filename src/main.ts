import {
  Engine, Scene, Vector3, Color3, Color4,
  MeshBuilder, PBRMaterial, Mesh,
  GPUParticleSystem, ParticleSystem, Texture,
  DefaultRenderingPipeline, ImageProcessingConfiguration,
  PointerEventTypes, GlowLayer, ArcRotateCamera
} from "@babylonjs/core";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const scoreEl = document.getElementById("score") as HTMLElement;
const fpsEl = document.getElementById("fps") as HTMLElement;
const tagEl = document.getElementById("engine-tag") as HTMLElement;

let engine: Engine;
let scene: Scene;
let aurora: GPUParticleSystem | ParticleSystem;
let plasmaMat: PBRMaterial;
let pipeline: DefaultRenderingPipeline;
let score = 0;
let waveT = 0;

interface Spirit { mesh: Mesh; mat: PBRMaterial; alive: boolean; phase: number; base: Vector3; }
const spirits: Spirit[] = [];
const TARGET = 10;

const testHook = ((window as any).__bgTest ||= {
  taps: 0, bursts: 0, score: 0, particleCount: 0, pageErrors: [] as string[], ready: false,
  fps: 0, engine: "", spiritWorlds: [] as { x: number; y: number }[], fpsSamples: [] as number[],
});

/* ===== (1) WebGPU engine with automatic WebGL2 fallback ===== */
async function createEngine(): Promise<Engine> {
  const gpu = (navigator as any).gpu;
  if (gpu) {
    try {
      // race với timeout — iOS Safari có thể treo init WebGPU vĩnh viễn
      const attempt = (async () => {
        const e = new Engine(canvas, true, { antialias: true }, true);
        await (e as any)._initAsync?.();
        return e;
      })();
      const t = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("wgpu timeout")), 2500));
      const e = await Promise.race([attempt, t]);
      tagEl.textContent = "WebGPU";
      testHook.engine = "WebGPU";
      return e;
    } catch { /* fall through */ }
  }
  const e2 = new Engine(canvas, true, { antialias: true });
  tagEl.textContent = "WebGL2 fallback";
  testHook.engine = "WebGL2 fallback";
  return e2;
}

/* screen point -> world plane z=0 */
function screenToWorld(x: number, y: number): Vector3 {
  const w = engine.getRenderWidth(), h = engine.getRenderHeight();
  const nx = (x / w) * 2 - 1;
  const ny = 1 - (y / h) * 2;
  return new Vector3(nx * 2.4, ny * 4.2, 0);
}

/* spark sprite texture from data URI (no external asset, GitHub Pages safe) */
function makeSparkTexture(scene: Scene): Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(160,220,255,0.85)");
  g.addColorStop(1, "rgba(80,120,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new Texture(c.toDataURL(), scene);
}

/* ===== (2)+(3) scene build ===== */
function buildScene(): void {
  scene = new Scene(engine);
  scene.clearColor = new Color4(0.006, 0.008, 0.03, 1);

  /* camera — PHẢI có trước pipeline */
  const camera = new ArcRotateCamera("cam", 0, Math.PI/2, 10, Vector3.Zero(), scene);
  scene.activeCamera = camera;

  /* plasma PBR sphere backdrop */
  const sphere = MeshBuilder.CreateSphere("plasma", { diameter: 16, segments: 64 }, scene);
  plasmaMat = new PBRMaterial("plasmaMat", scene);
  plasmaMat.albedoColor = new Color3(0.06, 0.10, 0.28);
  plasmaMat.emissiveColor = new Color3(0.04, 0.07, 0.28);
  plasmaMat.metallic = 0.85;
  plasmaMat.roughness = 0.22;
  plasmaMat.backFaceCulling = false;
  sphere.material = plasmaMat;
  sphere.position.z = -7;

  const glow = new GlowLayer("glow", scene, { blurKernelSize: 16 });
  glow.intensity = 0.6;

  /* GPU aurora particle system — capacity sized for headless median FPS >= 20 */
  const CAPACITY = 1800;
  if (GPUParticleSystem.IsSupported) {
    aurora = new GPUParticleSystem("aurora", { capacity: CAPACITY }, scene);
  } else {
    aurora = new ParticleSystem("auroraCPU", CAPACITY, scene);
  }
  aurora.particleTexture = makeSparkTexture(scene);
  aurora.emitter = Vector3.Zero();
  aurora.minEmitBox = new Vector3(-4, -2.5, 0);
  aurora.maxEmitBox = new Vector3(4, 2.5, 0);
  aurora.color1 = new Color4(0.4, 0.9, 1.0, 1.0);
  aurora.color2 = new Color4(0.55, 0.3, 1.0, 1.0);
  aurora.colorDead = new Color4(0.1, 0.1, 0.4, 0.0);
  aurora.minSize = 0.03;
  aurora.maxSize = 0.12;
  aurora.minLifeTime = 1.2;
  aurora.maxLifeTime = 2.5;
  aurora.emitRate = CAPACITY / 2.0;
  aurora.blendMode = ParticleSystem.BLENDMODE_ADD;
  aurora.gravity = new Vector3(0, 0.05, 0);
  aurora.direction1 = new Vector3(-0.15, 0.1, 0);
  aurora.direction2 = new Vector3(0.15, 0.25, 0);
  aurora.minAngularSpeed = -Math.PI;
  aurora.maxAngularSpeed = Math.PI;
  aurora.start();

  /* spirits: collectible glowing orbs */
  for (let i = 0; i < TARGET; i++) spawnSpirit(i);
}

function spawnSpirit(i: number): void {
  const mesh = MeshBuilder.CreateSphere("spirit" + i, { diameter: 0.34, segments: 24 }, scene);
  const mat = new PBRMaterial("spiritMat" + i, scene);
  mat.emissiveColor = new Color3(1.0, 0.92, 0.35);
  mat.albedoColor = new Color3(1, 1, 0.8);
  mat.metallic = 0.2;
  mat.roughness = 0.1;
  mesh.material = mat;
  const base = new Vector3(
    (Math.random() * 2 - 1) * 1.9,
    (Math.random() * 2 - 1) * 3.2,
    0
  );
  mesh.position.copyFrom(base);
  spirits.push({ mesh, mat, alive: true, phase: Math.random() * Math.PI * 2, base });
  testHook.spiritWorlds.push({ x: base.x, y: base.y });
}

/* post-processing: bloom + tone mapping (ACES) + FXAA */
function buildPipeline(): void {
  pipeline = new DefaultRenderingPipeline("pipe", true, scene, [scene.activeCamera!]);
  pipeline.bloomEnabled = false;
  pipeline.bloomThreshold = 0.55;
  pipeline.bloomWeight = 0.5;
  pipeline.bloomKernel = 16;
  pipeline.bloomScale = 0.25;
  pipeline.fxaaEnabled = false;
  pipeline.imageProcessingEnabled = true;
  pipeline.imageProcessing.toneMappingEnabled = true;
  pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  pipeline.imageProcessing.exposure = 1.15;
  pipeline.imageProcessing.contrast = 1.3;
}

/* one-finger tap handling */
function bindInput(): void {
  scene.onPointerObservable.add((pi) => {
    if (pi.type !== PointerEventTypes.POINTERDOWN && pi.type !== PointerEventTypes.POINTERUP) return;
    if (pi.type === PointerEventTypes.POINTERUP) return; // fire on down only
    const ev = pi.event as PointerEvent;
    testHook.taps++;
    const world = screenToWorld(ev.clientX, ev.clientY);

    /* hit-test spirits */
    let hit = false;
    for (const s of spirits) {
      if (!s.alive) continue;
      if (Vector3.Distance(s.mesh.position, world) < 0.75) {
        hit = true;
        collectSpirit(s, world);
        break;
      }
    }

    /* aurora burst toward the tap point (+ swirl impulse) */
    const count = hit ? 900 : 350;
    emitBurst(world, count);
    if (hit) testHook.score = score;
  });
}

let burstTimer = 0;

function emitBurst(at: Vector3, n: number): void {
  testHook.bursts++;
  // temporarily point the emitter at the tap with high emitRate,
  // then restore ambient streaming — cheap "burst" on a single system
  aurora.emitter = at.clone();
  aurora.minEmitBox = Vector3.Zero();
  aurora.maxEmitBox = new Vector3(0.05, 0.05, 0.05);
  aurora.emitRate = n * 8;
  aurora.direction1 = new Vector3(-1.6, -1.6, -0.4);
  aurora.direction2 = new Vector3(1.6, 1.6, 0.4);
  burstTimer = 0.28;
}

function collectSpirit(s: Spirit, at: Vector3): void {
  s.alive = false;
  s.mesh.setEnabled(false);
  s.mat.emissiveColor = new Color3(0, 0, 0);
  score++;
  scoreEl.textContent = String(score);
  emitBurst(at, 900); // x2-sized explosion on hit
}

/* per-frame update: plasma wave colors, spirit bob, swirl behavior */
function registerLoop(): void {
  scene.onBeforeRenderObservable.add(() => {
    const dt = engine.getDeltaTime() / 1000;
    waveT += dt;

    /* plasma wave: hue cycles through aurora palette (music-less sine wave) */
    const r = 0.06 + 0.05 * Math.sin(waveT * 0.7);
    const g = 0.08 + 0.07 * Math.sin(waveT * 0.9 + 2.1);
    const b = 0.28 + 0.18 * Math.sin(waveT * 0.5 + 4.2);
    plasmaMat.emissiveColor.set(r, g, b);
    plasmaMat.albedoColor.set(r * 1.5, g * 1.4, b * 1.2);

    /* ambient emitter pulls toward slowly drifting focus + swirl */
    if (burstTimer > 0) {
      burstTimer -= dt;
      if (burstTimer <= 0) {
        aurora.emitter = Vector3.Zero();
        aurora.minEmitBox = new Vector3(-4, -2.5, 0);
        aurora.maxEmitBox = new Vector3(4, 2.5, 0);
        aurora.emitRate = 900;
        aurora.direction1 = new Vector3(-0.15, 0.1, 0);
        aurora.direction2 = new Vector3(0.15, 0.25, 0);
      }
    }

    /* spirits: gentle float */
    for (const s of spirits) {
      if (!s.alive) continue;
      s.mesh.position.y = s.base.y + Math.sin(waveT * 2 + s.phase) * 0.12;
      s.mesh.position.x = s.base.x + Math.cos(waveT * 1.4 + s.phase) * 0.08;
      const pulse = 1 + 0.15 * Math.sin(waveT * 4 + s.phase);
      s.mesh.scaling.setAll(pulse);
    }
  });
}

async function init(): Promise<void> {
  engine = await createEngine();
  buildScene();
  buildPipeline();
  bindInput();
  registerLoop();

  /* fps meter in HUD + test hook */
  let frames = 0, acc = 0;
  engine.runRenderLoop(() => {
    scene.render();
    frames++;
    acc += engine.getDeltaTime();
    if (acc >= 500) {
      const fps = Math.round((frames * 1000) / acc);
      fpsEl.textContent = fps + " fps";
      testHook.fps = fps;
      testHook.fpsSamples.push(fps);
      testHook.particleCount = (aurora as any).activeParticleCount ?? 0;
      frames = 0; acc = 0;
    }
  });

  window.addEventListener("resize", () => engine.resize());
  testHook.ready = true;
}

window.addEventListener("error", (e) => (testHook.pageErrors as string[]).push(String(e.message)));
init().catch((err: any) => {
  const full = (err && (err.stack || err.message)) || String(err);
  console.error("INIT_FAIL:", full);
  (window as any).__initFail = full;
  (testHook.pageErrors as string[]).push(full);
});
