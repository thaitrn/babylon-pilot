# Meowa asset brief — Linh Quang: Vượt Bão

**Status:** APPROVED ASSET-REFERENCE ONLY (2026-08-30)  
**Scope of this file:** handoff brief based strictly on the CEO-approved manifest already in this repository. It creates no new art contract, does not call Meowa, and must not overwrite any existing file under `assets/meowa/`.

## 1. Product and representation contract

| Gameplay fact | Asset implication | Evidence |
|---|---|---|
| 3D, third-person, auto-forward three-lane runner | Game objects need a readable front/three-quarter silhouette while approaching the player; the 2D files are concept/HUD/key art references, not 3D meshes. | `docs/game-redesign-prd.md:100-104`; `src/scene/createScene.ts:36-69,111-123` |
| Pilot/vehicle is white-cyan and sits low in the view | Use the selected bird-like lightcraft silhouette; keep its bright edge and broad body readable at small scale. | `docs/game-redesign-prd.md:408`; `src/scene/createScene.ts:59-68` |
| Shard vs. hazard must be distinguishable without colour alone | Shard: rounded diamond/gold; hazard: sharp, asymmetric red-purple core. Do not substitute a same-shape recolour. | `docs/game-redesign-prd.md:103,409-410,451-452`; `src/scene/createScene.ts:111-123` |
| Shield is a survival state; boost is not MVP gameplay | Shield is HUD/feedback motif only. `speed-boost.png` is reference-only and must not introduce a power-up, button, or second collectible. | `docs/game-redesign-prd.md:146-151,410,442-445` |
| Input is tap/drag to one of three invisible lanes | Do not use persistent left/right image buttons; tutorial arrows are optional reference only. | `docs/game-redesign-prd.md:105-125,411,445`; `src/main.ts:112-143` |

## 2. Approved visual direction

- **Mood:** dark navy aurora, clean luminous arcade flight; environmental saturation stays below gameplay objects.
- **Silhouette/camera:** player is a white-cyan, bird-like lightcraft seen from rear/top three-quarter; use only as a 2D key-art, UI, concept, or deliberately billboarded reference. It is not a claim of a 3D Meowa model.
- **Object grammar:** rounded gold diamond = Mảnh Sáng; angular asymmetric red-purple fragment = Mảnh Vỡ; shield emblem = status/feedback. This matches the actual Babylon primitives: light craft cylinder, shard polyhedron, and distinct hazard polyhedron (`src/scene/createScene.ts:60-68,111-123`).
- **Mobile composition (844×390 primary):** reserve centre/horizon for telegraphing; player remains in lower 20–25% of the view; HUD only along the top. Input is the open three-way playfield, not visible controls.

### Palette

| Token | Hex | Use |
|---|---|---|
| Deep space | `#05081A` | background/panel base |
| Aurora navy | `#11265B` | secondary environment/panel edge |
| Player white | `#EAFBFF` | craft/high-priority text |
| Player cyan | `#66E3FF` | craft glow, shield/status accent, CTA |
| Shard gold | `#FFD76A` | collectable/objective |
| Shard hot | `#FFF3B0` | small highlight only |
| Hazard purple | `#A63DFF` | hazard secondary mass |
| Danger red | `#FF4D6D` | hazard core/hit state |
| Success | `#66F2A3` | success state |
| Primary text | `#F4F8FF` | essential text |
| Muted text | `#A9B8D8` | secondary text |

Measured against `#05081A`: primary text **18.67:1**, muted text **9.98:1**, cyan **13.25:1**, gold **14.37:1**, danger **6.19:1**, success **14.01:1**. Therefore essential text clears WCAG 4.5:1 and these non-text state colours clear 3:1; keep shape/icon/text redundancy for status.

## 3. Locked asset manifest and usage

All paths below already exist and are protected from deletion/overwrite. PNG alpha was audited locally: every gameplay/HUD crop has alpha extrema `(0,255)`; icon is intentionally opaque RGBA; cover/contact sheet are intentionally opaque RGB.

| Asset / approved target | Current file and exact size | Alpha/background | Permitted purpose / constraint |
|---|---|---|---|
| Source sheet | `source/.../ui_output.png` — 1536×1152 RGBA | transparent source | Provenance only; never use direct in runtime |
| Player concept | `selected/hero-lightcraft.png` — 447×423 RGBA | transparent | 2D concept/UI/key-art source; not a 3D mesh |
| Hazard variants | `selected/hazard-{a,b,c}.png` — 181×363, 208×359, 332×363 RGBA | transparent | Three distinct visual variants; preserve sharp silhouette and red core |
| Hazard family preview | `selected/hazard-family.png` — 900×400 RGBA | transparent | Review/contract preview; not a packed runtime atlas |
| Collectible | `selected/light-shard.png` — 245×250 RGBA | transparent | Mảnh Sáng concept/visual reference |
| Shield motif | `selected/shield.png` — 234×272 RGBA | transparent | shield HUD and hit-feedback motif |
| Boost reference | `selected/speed-boost.png` — 216×220 RGBA | transparent | explicitly rejected from MVP gameplay |
| HUD candidates | `selected/hud-{sound,pause,shard,shield}.png` — 192–197 px each side RGBA | transparent | optional HUD motif; CSS/accessible labels remain required |
| Tutorial arrows | `selected/hud-{left,right}.png` — 149×189 / 150×190 RGBA | transparent | tutorial/reference only; never persistent controls |
| App/GameHub icon | `selected/app-icon-512.png` — 512×512 RGBA | opaque navy background | export target is locked at 512×512 |
| GameHub cover | `selected/gamehub-cover-1200x630.png` — 1200×630 RGB | opaque key art | export target is locked at 1200×630; 2D key art, not gameplay screenshot |
| Review sheet | `contact-sheet.png` — 1800×1500 RGB | opaque | CEO-approved review evidence |

Existing controlled post-process is `assets/meowa/process_assets.py:9-130`; it crops the Meowa source, preserves RGBA for crops, and composes the opaque app icon, GameHub cover, and contact sheet. Do not rerun it over altered source without a new approved change request.

## 4. Readability and accessibility acceptance for a later FE integration

| Check | Requirement | Evidence / verification method |
|---|---|---|
| Gameplay scale | Test player, shard, and each hazard at 844×390 and 390×844 in the running scene; do not accept from contact-sheet size alone. | PRD `:449-454`; capture two in-game screenshots and verify no HUD occlusion |
| Shape redundancy | Hazard remains pointed/asymmetric with red core; shard remains rounded/diamond gold. | PRD `:103,409-410,451-452`; grayscale/desaturation screenshot comparison |
| HUD semantics | Image motif cannot replace text/ARIA label; sound/pause target remains >=44×44 CSS px. | PRD `:294-300,451-454`; code currently sets `aria-label` for mute in `src/ui/hud.ts:65-68` and 44px minimum in `index.html:54-60` |
| Open playfield | No left/right buttons during play; tap and drag route to lane selection. | PRD `:105-125,445`; `src/main.ts:112-143` |
| Motion | Glow/particle reference must not force extra runtime effects; honour reduced motion. | PRD `:454`; current scene reduces glow and particles in `src/scene/createScene.ts:71-97` |
| Contrast | Keep stated pairings on deep navy or remeasure after integration; text >=4.5:1, UI/component boundaries >=3:1. | palette measurements in §2; PRD `:294-300` |

## 5. Variants, provenance, and budget guardrail

- **Approved sensible variant count:** one player, three hazard silhouettes, one shard, one shield motif, four runtime-candidate HUD icons, two tutorial-only arrows, one icon, one cover. There is no need for more variants at this stage.
- **Provenance:** one approved Meowa `ui-gen-run` source job, `job_aff52e9d3a46447fbafaff06da954197`; its sanitized output record is `source/asset-sheet-run/.../final_outputs.json`.
- **Spend record:** the original job spent **72 credits** (190 → 118), exceeding the former 40-credit cap by 32. CEO accepted that exception and directed that all further paid generation stop (`docs/game-redesign-prd.md:436-462`).
- **This task's plan:** **0 additional credits; 0 Meowa calls; 0 new variants.** The historic 40-credit ceiling is not a reason to generate anything further. Preserve the current reserve of 118 as recorded in the approved PRD.

## 6. Handoff boundary

This brief authorizes no code integration. A later FE task may choose these files only as approved visual references after verifying the checks in §4. It must neither describe the PNGs as 3D models nor expand MVP with boost/persistent lane buttons. Any modification to selected assets, palette, target export dimensions, or new generation needs an explicit approved request and new provenance/budget review.
