import type { PersistentSettings, RunState } from "../game/types";
import { RUN_MS, TARGET_SHARDS, TOTAL_SHARDS } from "../game/config";
import { gradeFor } from "../game/scoring";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  n.className = cls;
  if (text) n.textContent = text;
  return n;
}

export interface HudHandles {
  root: HTMLElement;
  overlay: HTMLElement;
  hud: HTMLElement;
  shards: HTMLElement;
  timer: HTMLElement;
  shields: HTMLElement;
  score: HTMLElement;
  combo: HTMLElement;
  toast: HTMLElement;
  pause: HTMLElement;
  flash: HTMLElement;
  engineTag: HTMLElement;
  startBtn: HTMLButtonElement;
  retryBtn: HTMLButtonElement;
  muteBtn: HTMLButtonElement;
  resumeBtn: HTMLButtonElement;
}

export function mountHud(parent: HTMLElement): HudHandles {
  parent.innerHTML = "";
  const root = el("div", "ui-root");
  root.innerHTML = `
    <div class="hud-bar" id="hud-bar" hidden>
      <div class="hud-obj"><span class="hud-star">✦</span> <b id="hud-shards">0</b>/${TARGET_SHARDS}</div>
      <div class="hud-timer" id="hud-timer">01:10</div>
      <div class="hud-shields" id="hud-shields">◇◇◇</div>
    </div>
    <div class="hud-score" id="hud-score" hidden>0</div>
    <div class="hud-combo" id="hud-combo" hidden></div>
    <div class="hud-toast" id="hud-toast" hidden></div>
    <div class="flash" id="hud-flash" hidden></div>
    <div class="overlay" id="overlay" hidden></div>
    <div class="pause-layer" id="pause-layer" hidden>
      <p>Tạm dừng</p>
      <button type="button" class="cta" id="btn-resume">CHẠM ĐỂ TIẾP TỤC</button>
    </div>
    <div class="engine-tag" id="engine-tag" hidden></div>
  `;
  parent.appendChild(root);
  const overlay = root.querySelector("#overlay") as HTMLElement;
  const startBtn = document.createElement("button");
  const retryBtn = document.createElement("button");
  const muteBtn = document.createElement("button");
  const resumeBtn = root.querySelector("#btn-resume") as HTMLButtonElement;
  startBtn.type = "button";
  startBtn.className = "cta";
  startBtn.id = "btn-start";
  startBtn.textContent = "BẮT ĐẦU";
  retryBtn.type = "button";
  retryBtn.className = "cta";
  retryBtn.id = "btn-retry";
  retryBtn.textContent = "CHƠI LẠI";
  muteBtn.type = "button";
  muteBtn.className = "mute";
  muteBtn.id = "btn-mute";
  muteBtn.setAttribute("aria-label", "Âm thanh");
  return {
    root,
    overlay,
    hud: root.querySelector("#hud-bar") as HTMLElement,
    shards: root.querySelector("#hud-shards") as HTMLElement,
    timer: root.querySelector("#hud-timer") as HTMLElement,
    shields: root.querySelector("#hud-shields") as HTMLElement,
    score: root.querySelector("#hud-score") as HTMLElement,
    combo: root.querySelector("#hud-combo") as HTMLElement,
    toast: root.querySelector("#hud-toast") as HTMLElement,
    pause: root.querySelector("#pause-layer") as HTMLElement,
    flash: root.querySelector("#hud-flash") as HTMLElement,
    engineTag: root.querySelector("#engine-tag") as HTMLElement,
    startBtn,
    retryBtn,
    muteBtn,
    resumeBtn,
  };
}

function fmtTime(ms: number): string {
  const s = Math.max(0, Math.ceil((RUN_MS - ms) / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function renderHud(h: HudHandles, state: RunState, settings: PersistentSettings, reduced: boolean): void {
  const playing = state.phase === "PLAYING" || state.phase === "PORTAL_CHECK" || state.phase === "COUNTDOWN";
  h.hud.hidden = !playing && state.phase !== "PAUSED";
  h.score.hidden = h.hud.hidden;
  h.pause.hidden = state.phase !== "PAUSED";

  h.shards.textContent = String(state.shards);
  h.timer.textContent = fmtTime(state.elapsedMs);
  h.timer.classList.toggle("amber", RUN_MS - state.elapsedMs <= 10_000);
  const icons = ["◇", "◇", "◇"];
  for (let i = 0; i < state.shields; i++) icons[i] = "◆";
  h.shields.textContent = icons.join("");
  h.score.textContent = String(state.score);
  if (state.combo >= 3 && playing) {
    h.combo.hidden = false;
    h.combo.textContent = `x${state.combo}`;
  } else h.combo.hidden = true;

  if (state.waveToastUntilMs > state.elapsedMs && playing && state.lastWave > 1) {
    h.toast.hidden = false;
    h.toast.textContent = "BÃO MẠNH HƠN";
  } else h.toast.hidden = true;

  h.muteBtn.textContent = settings.soundEnabled ? "♪" : "🔇";
  h.muteBtn.classList.toggle("off", !settings.soundEnabled);

  if (state.phase === "TITLE") {
    h.overlay.hidden = false;
    h.overlay.innerHTML = "";
    const card = el("div", "card");
    card.append(
      el("h1", "title", "LINH QUANG: VƯỢT BÃO"),
      el("p", "pitch", "Thu 12 Mảnh Sáng trước khi cổng khép lại"),
      el("p", "rules", "Thu 12 Mảnh Sáng • Né Mảnh Vỡ • 3 Khiên"),
      el("p", "meta", "12 mục tiêu  ·  3 khiên  ·  70 giây"),
      el("p", "hint", "Chạm trái / giữa / phải để lái · A D hoặc ← →"),
    );
    const row = el("div", "row");
    row.append(h.startBtn, h.muteBtn);
    card.append(row);
    h.overlay.append(card);
  } else if (state.phase === "COUNTDOWN") {
    h.overlay.hidden = false;
    const n = Math.max(1, Math.ceil(state.countdownMs / 1000));
    h.overlay.innerHTML = `<div class="count">${n}</div>`;
  } else if (state.phase === "RESULT") {
    h.overlay.hidden = false;
    const ok = state.outcomeReason === "SUCCESS";
    const g = gradeFor(state.outcomeReason, state.shards, state.shields);
    const miss = Math.max(0, TARGET_SHARDS - state.shards);
    let reason = ok ? "THÀNH CÔNG" : "THẤT BẠI";
    if (state.outcomeReason === "SHIELDS_DEPLETED") reason = "Phi thuyền tan vỡ";
    if (state.outcomeReason === "NOT_ENOUGH_SHARDS") reason = `Cổng khép lại — thiếu ${miss} Mảnh Sáng`;
    h.overlay.innerHTML = "";
    const card = el("div", "card result");
    card.append(
      el("h2", ok ? "win" : "fail", reason),
      el("p", "grade", `Hạng ${g}  ·  ${state.shards}/${TOTAL_SHARDS}  ·  ${state.score}`),
      el("p", "best", `Kỷ lục: ${settings.bestScore}${settings.bestGrade ? " (" + settings.bestGrade + ")" : ""}`),
    );
    card.append(h.retryBtn);
    h.overlay.append(card);
  } else if (state.phase === "SUCCESS" || state.phase === "FAILURE") {
    h.overlay.hidden = true;
    h.overlay.innerHTML = "";
  } else if (state.phase === "PLAYING" || state.phase === "PORTAL_CHECK" || state.phase === "PAUSED") {
    h.overlay.hidden = true;
    h.overlay.innerHTML = "";
  }

  void reduced;
}
