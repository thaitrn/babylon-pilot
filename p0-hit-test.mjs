/**
 * P0 regression: [hidden] must beat .overlay/.pause-layer display:flex,
 * and real pointer clicks must change targetLane during PLAYING.
 * Optional: drive a full run via pointer thirds (no actions.setLane).
 *
 *   node p0-hit-test.mjs                 # CSS + local preview hit-test
 *   P0_FULL=1 node p0-hit-test.mjs       # also auto-win via pointer
 */
import { readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.join(root, "index.html"), "utf8");
const hud = readFileSync(path.join(root, "src/ui/hud.ts"), "utf8");

function fail(msg) {
  console.error("FAIL", msg);
  process.exit(1);
}

if (!/\[hidden\]\s*\{\s*display:\s*none\s*!important/i.test(html)) {
  fail("index.html missing [hidden]{display:none !important}");
}
if (!/h\.overlay\.innerHTML = ""/.test(hud) || !/PLAYING/.test(hud)) {
  fail("hud.ts must clear overlay.innerHTML when leaving COUNTDOWN into PLAYING");
}
console.log("PASS css+hud static P0 guards");

const URL = process.env.SMOKE_URL || "http://127.0.0.1:4177/";
const WANT_FULL = true;

function laneX(lane, w) {
  const third = w / 3;
  return Math.round(third * lane + third / 2);
}

async function maybeStartPreview() {
  if (process.env.SMOKE_URL) return { proc: null, url: process.env.SMOKE_URL };
  const proc = spawn("npx", ["vite", "preview", "--host", "127.0.0.1", "--port", "4177", "--strictPort"], {
    cwd: root,
    stdio: "pipe",
  });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("preview timeout")), 20000);
    const on = (buf) => {
      const s = String(buf);
      if (/Local:|4177/.test(s)) {
        clearTimeout(t);
        resolve();
      }
    };
    proc.stdout.on("data", on);
    proc.stderr.on("data", on);
    proc.on("error", reject);
  });
  return { proc, url: URL };
}

const { courseForRun } = await import("./src/game/course.ts");

const { proc, url } = await maybeStartPreview();
const require = createRequire(import.meta.url);
let exe;
try {
  const pw = require("playwright-core/package.json");
  void pw;
} catch { /* ignore */ }

let browser;
try {
  browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--use-angle=metal", "--ignore-gpu-blocklist"],
  });
} catch {
  browser = await chromium.launch({ headless: true });
}

const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await context.newPage();
try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction("window.__bgTest && window.__bgTest.ready", null, { timeout: 15000 });
  await page.click("#btn-start");
  await page.waitForFunction("window.__bgTest.phase === 'PLAYING'", null, { timeout: 8000 });

  const hit = await page.evaluate(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const el = document.elementFromPoint(w / 2, h / 2);
    const o = document.getElementById("overlay");
    const p = document.getElementById("pause-layer");
    return {
      id: el?.id || el?.className || el?.tagName,
      tag: el?.tagName,
      overlayHidden: o?.hidden,
      overlayDisplay: o ? getComputedStyle(o).display : null,
      overlayHTML: o?.innerHTML ?? "",
      pauseHidden: p?.hidden,
      pauseDisplay: p ? getComputedStyle(p).display : null,
    };
  });
  console.log("hit-test PLAYING", hit);
  if (hit.tag !== "CANVAS" && hit.id !== "renderCanvas") {
    fail(`elementFromPoint center = ${hit.id} (want canvas)`);
  }
  if (hit.overlayDisplay !== "none" || hit.pauseDisplay !== "none") {
    fail("overlay/pause still displayed during PLAYING");
  }
  if (hit.overlayHTML && hit.overlayHTML.includes("count")) {
    fail("overlay still has countdown HTML during PLAYING");
  }
  console.log("PASS no full-screen hit-testable layer when PLAYING");

  const before = await page.evaluate(() => window.__bgTest.targetLane);
  await page.mouse.click(laneX(0, 390), 500);
  await page.waitForTimeout(120);
  const afterL = await page.evaluate(() => window.__bgTest.targetLane);
  await page.mouse.click(laneX(2, 390), 500);
  await page.waitForTimeout(120);
  const afterR = await page.evaluate(() => window.__bgTest.targetLane);
  console.log({ before, afterL, afterR });
  if (afterL !== 0) fail(`left click targetLane=${afterL} want 0`);
  if (afterR !== 2) fail(`right click targetLane=${afterR} want 2`);
  console.log("PASS pointer click changes targetLane");
  console.log("enter-full", WANT_FULL);

  if (WANT_FULL) {
    const runIndex = await page.evaluate(() => window.__bgTest.runIndex);
    const course = courseForRun(runIndex);
    const tEnd = Date.now() + 200000;
    let lastSnap = null;
    while (Date.now() < tEnd) {
      const snap = await page.evaluate(() => ({
        phase: window.__bgTest.phase,
        elapsed: window.__bgTest.elapsedMs,
        shards: window.__bgTest.shards,
        shields: window.__bgTest.shields,
        outcome: window.__bgTest.outcomeReason,
      }));
      lastSnap = snap;
      if (snap.phase === "RESULT") {
        console.log("run end", snap);
        if (snap.shards < 12 || snap.shields < 1 || snap.outcome !== "SUCCESS") {
          fail(`win criteria not met ${JSON.stringify(snap)}`);
        }
        const txt = await page.textContent("#overlay");
        if (!txt || !txt.includes("THÀNH CÔNG")) fail(`result text=${txt}`);
        console.log("PASS pointer-driven win", snap);
        lastSnap = { ...snap, won: true };
        break;
      }
      const t = snap.elapsed;
      const hazardsSoon = course.filter((e) => e.kind === "HAZARD" && e.atMs >= t - 40 && e.atMs <= t + 420);
      const shardsSoon = course.filter((e) => e.kind === "SHARD" && e.atMs >= t - 40 && e.atMs <= t + 520);
      const blocked = new Set(hazardsSoon.map((e) => e.lane));
      let best = 1;
      const shard = shardsSoon[0];
      if (shard && !blocked.has(shard.lane)) best = shard.lane;
      else {
        best = ([0, 1, 2].find((l) => !blocked.has(l)) ?? 1);
      }
      await page.mouse.click(laneX(best, 390), 480);
      await page.waitForTimeout(30);
    }
    if (!lastSnap || !lastSnap.won) fail(`no SUCCESS before timeout last=${JSON.stringify(lastSnap)}`);
  }
} finally {
  await browser.close();
  if (proc) proc.kill();
}
console.log("all P0 hit-test passed");
