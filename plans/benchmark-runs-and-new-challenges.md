# Plan: benchmark runs (opus 4.7/4.8) + 4 new challenges

## Phase 1 — Run benchmark sessions (3 separate pi sessions)

- [x] Prepare prompt + PM2 wrapper for `pi opus-4.7 high`
- [x] Prepare prompt + PM2 wrapper for `pi opus-4.8 high`
- [x] Prepare prompt + PM2 wrapper for `pi opus-4.8 xhigh`
- [x] Launch all three sessions via PM2 (separate sessions, disjoint output folders)
- [x] Monitor opus-4.7 high to completion (all 3 challenges)
- [x] Monitor opus-4.8 high to completion (all 3 challenges)
- [x] Monitor opus-4.8 xhigh to completion (all 3 challenges)

## Phase 2 — Verify results are correct and in the right folders

- [x] Verify ch01 solutions compile (`tsgo --noEmit --strict`) for each new run — all exit 0
- [x] Verify ch02 deliverables present (index.html + sketch.js) for each new run — JS valid, p5 CDN
- [x] Verify ch03 deliverables present (overview.puml + overview.md, `!theme blueprint`) for each new run — generic, valid
- [x] Verify duration files present and correctly named for each run/challenge
- [x] Confirm no run read/contaminated sibling result folders

## Phase 3 — Commit / PR / merge

- [x] Commit the new benchmark results
- [x] Open PR (#2), verify mergeable, merge

## Phase 4 — Design 4 new clever challenges (04-07)

- [x] Challenge 04 — Bug hunt: subtle defect detection (runtime semantics insight)
- [x] Challenge 05 — Reverse-engineer an obfuscated function (comprehension + equivalence)
- [x] Challenge 06 — Type-level expression evaluator (type-system computation)
- [x] Challenge 07 — Type-level lambda calculus normaliser (frontier; may be unsolved)
- [x] Validate each new challenge spec is self-consistent and solvable/gradeable (reference solutions pass graders for 04-06; ch07 spec passable + runtime selfcheck)
- [x] Commit / PR / merge new challenges (PR #3, CI green on main)

## Phase 5 — Repo improvements (no changes to existing tests/results)

- [x] Add CI workflow (verify graders vs references, typecheck references, scoreboard freshness) — verified locally with `act`
- [x] Add a results summary / scoreboard generator (`scripts/scoreboard.ts` -> RESULTS.md)
- [x] Update README (challenge table + tooling) and add minimal additive INSTRUCTIONS clarification (no existing tests/results changed)
