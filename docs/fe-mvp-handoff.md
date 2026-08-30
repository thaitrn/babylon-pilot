# FE MVP handoff — Linh Quang: Vượt Bão

- Commit: 5c3ab3e
- Canonical: https://thaitrn.github.io/babylon-pilot/
- Contract: docs/game-redesign-prd.md

## Mapping
| PRD | Implementation |
|---|---|
| State machine | src/game/stateMachine.ts + simulation.ts |
| Score/grade | src/game/scoring.ts |
| 18 shard course 70s | src/game/course.ts |
| 3-lane input | src/game/input.ts + main.ts |
| HUD/title/result | src/ui/hud.ts + index.html |
| Scene + fallback engine | src/scene/createScene.ts + main.ts createEngine |
| localStorage | src/storage.ts key babylon-pilot:v1 |
| QA hook | window.__bgTest {ready,phase,elapsedMs,lane,shards,shields,combo,score,outcomeReason,fpsSamples,pageErrors,runIndex,actions.start/setLane/retry/tick} |

## Evidence
- hermes-evidence fe-rules exit=0 (node --experimental-strip-types src/game/runTests.ts)
- hermes-evidence fe-tsc exit=0
- hermes-evidence fe-build exit=0 — main JS gzip 1,311.30 kB (< 1.50 MiB)

## Verify
npm test && npm run build; play title → countdown → 3 lanes → result/retry.

## Risks
FUN-GATE / Safari iOS / motion comfort / lane feel need playtest (PM child t_e3c4fddc).
No 10-person playtest in this lane.
