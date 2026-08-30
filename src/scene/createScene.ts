import {
  Engine, Scene, Vector3, Color3, Color4, MeshBuilder, PBRMaterial, Mesh,
  ParticleSystem, Texture, DefaultRenderingPipeline, ImageProcessingConfiguration,
  GlowLayer, UniversalCamera, TransformNode,
} from "@babylonjs/core";
import type { LiveEntity, RunState } from "../game/types";
import { LANE_X, PLAYER_Z } from "../game/config";

export interface SceneKit {
  scene: Scene;
  camera: UniversalCamera;
  player: Mesh;
  shipNode: TransformNode;
  pool: Map<string, Mesh>;
  pipeline: DefaultRenderingPipeline;
  aurora: ParticleSystem;
}

function sparkTex(scene: Scene): Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(160,220,255,0.7)");
  g.addColorStop(1, "rgba(80,120,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new Texture(c.toDataURL(), scene);
}

export function createGameScene(engine: Engine, reduced: boolean): SceneKit {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.02, 0.03, 0.1, 1);

  const camera = new UniversalCamera("cam", new Vector3(0, 3.2, -8.5), scene);
  camera.setTarget(new Vector3(0, 1.2, 12));
  camera.fov = 0.9;
  scene.activeCamera = camera;

  const floor = MeshBuilder.CreateGround("lane", { width: 10, height: 80 }, scene);
  const floorMat = new PBRMaterial("floor", scene);
  floorMat.albedoColor = new Color3(0.04, 0.07, 0.16);
  floorMat.metallic = 0.1;
  floorMat.roughness = 0.85;
  floorMat.emissiveColor = new Color3(0.02, 0.04, 0.1);
  floor.material = floorMat;
  floor.position.z = 20;

  for (const x of LANE_X) {
    const line = MeshBuilder.CreateBox("g" + x, { width: 0.06, height: 0.02, depth: 80 }, scene);
    const m = new PBRMaterial("gm" + x, scene);
    m.emissiveColor = new Color3(0.15, 0.35, 0.55);
    m.albedoColor = new Color3(0.1, 0.2, 0.3);
    line.material = m;
    line.position.set(x, 0.02, 20);
  }

  const shipNode = new TransformNode("shipNode", scene);
  const player = MeshBuilder.CreateCylinder("ship", { diameterTop: 0, diameterBottom: 0.7, height: 1.4, tessellation: 8 }, scene);
  player.rotation.x = Math.PI / 2;
  player.parent = shipNode;
  const pmat = new PBRMaterial("shipMat", scene);
  pmat.albedoColor = new Color3(0.92, 0.98, 1);
  pmat.emissiveColor = new Color3(0.4, 0.89, 1);
  pmat.metallic = 0.3;
  pmat.roughness = 0.25;
  player.material = pmat;
  shipNode.position.set(0, 0.6, PLAYER_Z);

  const glow = new GlowLayer("glow", scene, { blurKernelSize: 16 });
  glow.intensity = reduced ? 0.25 : 0.55;

  const cap = reduced ? 400 : 900;
  const aurora = new ParticleSystem("aurora", cap, scene);
  aurora.particleTexture = sparkTex(scene);
  aurora.emitter = new Vector3(0, 2, 18);
  aurora.minEmitBox = new Vector3(-6, 0, -8);
  aurora.maxEmitBox = new Vector3(6, 6, 20);
  aurora.color1 = new Color4(0.4, 0.9, 1, 0.8);
  aurora.color2 = new Color4(0.55, 0.3, 1, 0.7);
  aurora.colorDead = new Color4(0.1, 0.1, 0.4, 0);
  aurora.minSize = 0.04;
  aurora.maxSize = 0.14;
  aurora.minLifeTime = 1.2;
  aurora.maxLifeTime = 2.4;
  aurora.emitRate = cap / 2.5;
  aurora.blendMode = ParticleSystem.BLENDMODE_ADD;
  aurora.gravity = new Vector3(0, 0.04, 0);
  aurora.start();

  const pipeline = new DefaultRenderingPipeline("pipe", true, scene, [camera]);
  pipeline.bloomEnabled = !reduced;
  pipeline.bloomThreshold = 0.6;
  pipeline.bloomWeight = 0.35;
  pipeline.bloomKernel = 16;
  pipeline.bloomScale = 0.25;
  pipeline.fxaaEnabled = false;
  pipeline.imageProcessingEnabled = true;
  pipeline.imageProcessing.toneMappingEnabled = true;
  pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  pipeline.imageProcessing.exposure = 1.1;
  pipeline.imageProcessing.contrast = 1.2;

  return { scene, camera, player, shipNode, pool: new Map(), pipeline, aurora };
}

function meshFor(kit: SceneKit, ent: LiveEntity): Mesh {
  let m = kit.pool.get(ent.id);
  if (m) return m;
  if (ent.kind === "SHARD") {
    m = MeshBuilder.CreatePolyhedron(ent.id, { type: 1, size: 0.35 }, kit.scene);
    const mat = new PBRMaterial(ent.id + "m", kit.scene);
    mat.emissiveColor = new Color3(1, 0.84, 0.42);
    mat.albedoColor = new Color3(1, 0.95, 0.69);
    m.material = mat;
  } else {
    m = MeshBuilder.CreatePolyhedron(ent.id, { type: 2, size: 0.42 }, kit.scene);
    const mat = new PBRMaterial(ent.id + "m", kit.scene);
    mat.emissiveColor = new Color3(0.65, 0.24, 1);
    mat.albedoColor = new Color3(1, 0.3, 0.43);
    m.material = mat;
  }
  kit.pool.set(ent.id, m);
  return m;
}

export function syncEntities(kit: SceneKit, state: RunState, impulse: number, reduced: boolean): void {
  kit.shipNode.position.x = state.laneX;
  kit.shipNode.position.y = 0.6;
  kit.shipNode.rotation.z = -state.laneX * 0.08;
  kit.camera.position.x = state.laneX * 0.25 + (reduced ? 0 : impulse);
  kit.camera.position.y = 3.2;

  const seen = new Set<string>();
  for (const ent of state.entities) {
    const mesh = meshFor(kit, ent);
    if (ent.resolved) {
      mesh.setEnabled(false);
      continue;
    }
    seen.add(ent.id);
    mesh.setEnabled(true);
    mesh.position.set(LANE_X[ent.lane], 0.7, ent.z);
    mesh.rotation.y += 0.03;
  }
  for (const [id, mesh] of kit.pool) {
    if (!seen.has(id) && !state.entities.some((e) => e.id === id && !e.resolved)) mesh.setEnabled(false);
  }
}

export function resetPool(kit: SceneKit): void {
  for (const mesh of kit.pool.values()) mesh.setEnabled(false);
}
