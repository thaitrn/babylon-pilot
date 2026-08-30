/**
 * Live (or local) smoke for Babylon Pilot.
 * Usage:
 *   SMOKE_URL=https://thaitrn.github.io/babylon-pilot/ npm run smoke
 *   SMOKE_URL=http://127.0.0.1:4173/babylon-pilot/ npm run smoke
 * Optional: SMOKE_BROWSER=chromium|webkit  SMOKE_FULL=1
 */
import { chromium, webkit } from "playwright-core";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const URL = process.env.SMOKE_URL || "https://thaitrn.github.io/babylon-pilot/";
const WANT_FULL = process.env.SMOKE_FULL !== "0";
const which = (process.env.SMOKE_BROWSER || "chromium").toLowerCase();

function resolveBrowserExe(kind) {
  const env = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    || process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE_PATH;
  if (env && existsSync(env)) return env;
  try {
    const pw = require("playwright-core/package.json");
    const root = path.dirname(pw);
    // Prefer browsers installed by playwright
    return undefined;
  } catch {
    return undefined;
  }
}

function worldToScreen(wx, wy, w, h) {
  const x = ((wx / 2.4) + 1) / 2 * w;
  const y = (1 - wy / 4.2) / 2 * h;
  return { x: Math.round(x), y: Math.round(y) };
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function launch(kind) {
  const launcher = kind === "webkit" ? webkit : chromium;
  const exe = resolveBrowserExe(kind);
  const opts = { headless: false, args: ["--use-angle=metal", "--enable-webgl", "--ignore-gpu-blocklist"] };
  if (exe) opts.executablePath = exe;
  try {
    return await launcher.launch(opts);
  } catch (e) {
    const msg = String(e);
    if (kind === "webkit") throw e;
    // Chromium channel fallback (system Chrome)
    return await chromium.launch({
      channel: "chrome",
      headless: false,
      args: opts.args,
    });
  }
}

async function runViewport(browser, name, viewport, hasTouch, useTap) {
  const context = await browser.newContext({
    viewport,
    hasTouch,
    isMobile: hasTouch,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });

  const t0 = Date.now();
  const resp = await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction("window.__bgTest && window.__bgTest.ready", null, { timeout: 10000 });
  const readyMs = Date.now() - t0;

  const canvas = await page.evaluate(() => {
    const c = document.getElementById("renderCanvas");
    return { w: c?.width, h: c?.height, cw: c?.clientWidth, ch: c?.clientHeight };
  });
  const engineTag = await page.textContent("#engine-tag");
  let hook = await page.evaluate(() => JSON.parse(JSON.stringify(window.__bgTest)));

  // AC-05: 10s FPS sample after ready (hook ~every 500ms)
  const fpsStart = Date.now();
  await page.waitForTimeout(10500);
  const fpsHook = await page.evaluate(() => JSON.parse(JSON.stringify(window.__bgTest)));
  const samples = (fpsHook.fpsSamples || []).filter((n) => n > 0);
  const last10s = samples.slice(-20);

  // one pointer -> one tap + at least one burst
  const cx = Math.round(viewport.width / 2);
  const cy = Math.round(viewport.height / 2);
  if (useTap) await page.touchscreen.tap(cx, cy);
  else await page.mouse.click(cx, cy);
  await page.waitForTimeout(400);
  const afterOne = await page.evaluate(() => JSON.parse(JSON.stringify(window.__bgTest)));

  let full = null;
  if (WANT_FULL) {
    const worlds = afterOne.spiritWorlds || [];
    for (const sp of worlds) {
      const p = worldToScreen(sp.x, sp.y, viewport.width, viewport.height);
      if (useTap) await page.touchscreen.tap(p.x, p.y).catch(() => page.mouse.click(p.x, p.y));
      else await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(220);
    }
    // extra scatter if some missed
    for (let i = 0; i < 40; i++) {
      const h = await page.evaluate(() => window.__bgTest.score);
      if (h >= 10) break;
      const x = 30 + Math.random() * (viewport.width - 60);
      const y = 80 + Math.random() * (viewport.height - 140);
      if (useTap) await page.touchscreen.tap(x, y).catch(() => page.mouse.click(x, y));
      else await page.mouse.click(x, y);
      await page.waitForTimeout(160);
    }
    full = await page.evaluate(() => JSON.parse(JSON.stringify(window.__bgTest)));
  }

  await context.close();
  return {
    name,
    viewport,
    httpStatus: resp?.status() ?? null,
    readyMs,
    engineTag,
    canvas,
    pageErrors,
    consoleErrors,
    ready: hook.ready,
    afterOne: { taps: afterOne.taps, bursts: afterOne.bursts, score: afterOne.score },
    full10: full ? { taps: full.taps, score: full.score } : null,
    fps: {
      last: fpsHook.fps,
      particleCount: fpsHook.particleCount,
      sampleCount: last10s.length,
      median: median(last10s),
      min: last10s.length ? Math.min(...last10s) : 0,
      elapsedMs: Date.now() - fpsStart,
    },
  };
}

const results = { url: URL, browser: which, at: new Date().toISOString(), runs: [] };
const browser = await launch(which);
try {
  results.runs.push(await runViewport(browser, "mobile-390x844", { width: 390, height: 844 }, true, true));
  results.runs.push(await runViewport(browser, "desktop-1440x900", { width: 1440, height: 900 }, false, false));
} finally {
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
const fail = results.runs.some((r) =>
  !r.ready || r.pageErrors.length || r.afterOne.taps < 1 || r.afterOne.bursts < 1
  || (WANT_FULL && r.full10 && r.full10.score < 10)
  || r.fps.median < 20
);
process.exit(fail ? 1 : 0);
