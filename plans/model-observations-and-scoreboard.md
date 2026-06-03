# Plan: model observations, interpretations & README scoreboard

Goal: a beautiful, honest comparison of every harness·model run — pros/cons in
`docs/results/interpretations.md` and a scored scoreboard table in `README.md`.

## Key facts that shape the design

- Runs split into two cohorts: **full gauntlet** (attempted challenges 04-07)
  and **core three** (only 01-03 existed at run time). Comparing absolute
  scores across cohorts is misleading, so present them in two clearly-labelled
  tables.
- ch02/ch03 are graded by deliverable presence (visual/manual), not behaviour;
  ch01/04/05/06/07 have objective graders. Weighting must reflect this.
- Some folders are naming variants of the same run and must be merged:
  `pi_opus-4.6` + `pi_claude-opus-4-6`; `pi_gemma-4-26b-a4b` + `..._q6k` (Apr).
- `opencode_gemma-4-26b-q8_0` has a corrupt duration marker (a unix timestamp);
  treat its speed as unknown.

## Tasks

- [x] Investigate repo: challenges, graders, scoreboard/grade scripts, CI
- [x] Regenerate `SCORES.md` so objective grades are current
- [x] Collect durations, deliverables and qualitative write-ups (bugs/analysis/notes)
- [x] Define a transparent scoring rubric (per-challenge weights, cohorts, speed metric)
- [x] Build `scripts/leaderboard.ts`: parse `SCORES.md` + durations, canonicalise
      and merge model runs, compute coverage/score/speed, inject a generated
      block into `README.md` between markers; support `--check`
- [x] Validate generated numbers against hand calculations
- [x] Write `docs/results/interpretations.md`: up to 3 pros / 3 cons per model,
      grounded in objective grades + the write-ups
- [x] Add the scoreboard section + framing prose + interpretations link to `README.md`
- [x] Wire `leaderboard.ts --check` into CI; add `npm` script
- [x] Quality checks: typecheck scripts, run `verify`, confirm freshness checks pass
- [x] Final verification end-to-end, then commit

## Phase 2 — Close coverage gaps (every model runs the challenges)

Triggered by the Opus runs only ever covering 01-03. Fill what is runnable today;
document the rest transparently.

- [x] Probe every harness: claude (real Opus 4.8 ✓), codex (quota→Jun 7),
      gemini-2.5-pro (QUOTA_EXHAUSTED), gemini-3-flash (✓ already complete),
      qwen (interactive OAuth only), local (shared llama.cpp — avoid)
- [x] Build isolated benchmark runner `scripts/bench/run-challenge.sh`
      (workspace = README + inputs + node_modules symlink; harvest deliverables)
- [x] Validate pipeline on ch05 (graded EQUIVALENT), then run Opus 4.8 on all 7
- [x] Grade the new run: `claude_opus-4.8_2026-06-03` = 100/100 (cracked ch07)
- [x] Regenerate SCORES.md, RESULTS.md, README leaderboard
- [x] Update interpretations: Opus entry, renumbered ranks, coverage section
- [x] Final verification (freshness + grader infra), then commit
