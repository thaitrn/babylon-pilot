# Meowa Asset QA Report — task t_d545f674

Date: 2026-08-30 · Profile: qa · Mode: independent verify-only (0 Meowa calls, 0 credits)

Scope: all files under `assets/meowa/` (source sheet, 16 selected assets, contact sheet,
manifest `design-brief.md`, post-process script `process_assets.py`).

## Verdict: PASS (with CEO-accepted budget exception)

All machine-checkable criteria pass. Subjective visual findings below; no fixes required.

## Checks and results

| # | Check | Expected | Actual | Result |
|---|-------|----------|--------|--------|
| 1 | Source sheet opens | PNG, 1536×1152, RGBA | exactly that, loads clean | PASS |
| 2 | Source alpha | real transparency | alpha min = 0 | PASS |
| 3 | Selected asset count | 16 PNGs covering 6 groups + UI | 16 files present | PASS |
| 4 | App icon | 512×512 RGBA (opaque navy OK) | 512×512 RGBA, fully opaque | PASS |
| 5 | GameHub cover | exactly 1200×630 | 1200×630 RGB opaque key art | PASS |
| 6 | Contact sheet | 1800×1500 | 1800×1500 RGB | PASS |
| 7 | Gameplay asset alpha (14 files) | RGBA with real transparency | all 14 RGBA, alpha min 0, opaque coverage 24–66% | PASS |
| 8 | Luminance contrast (14 gameplay assets) | silhouette readable on dark bg | metric: Rec.601 luma (0.299R+0.587G+0.114B), mean & p95 over subject pixels (alpha>128), minus dark-bg L=30 | PASS |
| 9 | Provenance | job `job_aff52e9d3a46447fbafaff06da954197`, 1 PNG output | matches `final_outputs.json` | PASS |
| 10 | Source→selected mapping | post-process crops per manifest | `process_assets.py:9-130` crops sheet, preserves RGBA, composes opaque icon/cover/contact | PASS |
| 11 | Budget | ≤40 credits, balance ≥30 | 72 spent (190→118) — **over cap**, but CEO-accepted exception per PM comment + `design-brief.md §5`; remaining 118 ≥ 30 | PASS (exception recorded) |
| 12 | No 3D misrepresentation | assets labeled 2D concept/reference only | manifest labels hero/hazards/shard as "not a 3D mesh", brief §6 forbids 3D claims | PASS |
| 13 | speed-boost scope | reference only, excluded from MVP | manifest line 53: "explicitly rejected from MVP gameplay" | PASS |

## Evidence (machine-verified ledger)

- `hermes-evidence: recorded label=meowa-asset-qa exit=0` — format/size/alpha/count checks (6/6 PASS)
- `hermes-evidence: recorded label=meowa-asset-visual exit=0` — contrast/opaque metrics 13/13 PASS
- `hermes-evidence: recorded label=meowa-asset-provenance exit=0` — job ID, output count, budget facts
- `hermes-evidence: recorded label=meowa-asset-qa-r3 exit=0` — independent re-measure (Rec.709 luma; hazard mean 20–25 due to different weighting, ordering identical: hazards lowest)
- `hermes-evidence: recorded label=meowa-asset-qa-r3b exit=0` — independent re-measure with the disclosed Rec.601 metric; reproduces every value in the assessment (hazard-c 31.5/134 lowest, light-shard 175.5/218)
- Note: one earlier probe run `label=meowa-asset-qa exit=1` (script bug, not an asset failure); superseded by the exit=0 rerun.

## Subjective visual assessment (mobile-scale)

Judged from contact-sheet structure + measured metrics (no vision tool in this session).
Contrast metric throughout: Rec.601 luma (0.299R+0.587G+0.114B), mean / p95 over subject
pixels (alpha>128), relative to dark-bg L=30 (background 0.2126·30+0.7152·30+0.0722·30=30).
Reproducible per-asset values (mean | p95 vs bg), verified run 3:
hazard-c 31.5|134, hazard-b 33.8|126, hazard-family 34.2|135, hazard-a 37.1|150,
light-shard 175.5|218, hero-lightcraft 149.4|221, shield 121.2|217, speed-boost 142.7|219,
HUD icons (sound/pause/shard/shield/left/right) 55–101 | 205–217.

- Pilot/lightcraft: broad white-cyan body, high contrast (149 mean / 221 p95) → legible small. Matches PRD "white-cyan, low in view".
- Hazards a/b/c: three distinct proportions, red cores, mean 31–37 / p95 126–150 → the LOWEST-contrast gameplay elements; still legible on the dark palette but flag as minor risk if background art ever lightens.
- Light-shard: bright (mean 176, p95 218) — fine on dark.
- Shield/boost motifs: clear outlines, contrast 121–143 mean / 217–219 p95.
- HUD icons (sound/pause/shard/shield/left/right): near-square 149–197 px, mean 55–101 / p95 205–217 → fine for tap targets.

## Fixes applied

Round-3 correction (this run, evidence-only): the round-1 report's contrast figures were
computed under an undisclosed metric and did not reproduce independently. Fix applied:
disclosed the exact metric (Rec.601 luma, mean/p95 over alpha>128 subject pixels, minus
dark-bg L=30) in row 8 and the assessment section, and replaced all non-reproducing
numbers with values verified by hermes-evidence label=meowa-asset-qa-r3b. No
canvas/alpha/export defects found. 0 Meowa calls, 0 credits spent. Asset PNGs and
commits c0b13de / dc71e59 untouched; only `assets/meowa/qa-report.md` modified.

## Remaining risks

1. Hazard-c / hazard-b have the lowest subject contrast (Rec.601 mean 31.5/33.8 vs dark bg; p95 134/126) — legible on current dark backgrounds but the first to suffer if background art lightens.
2. Subjective silhouette review is metrics-assisted only; recommend a 30-second human glance at `assets/meowa/contact-sheet.png`.
3. Budget cap exception (72/40) is permanently accepted-by-CEO, not a QA waiver.
