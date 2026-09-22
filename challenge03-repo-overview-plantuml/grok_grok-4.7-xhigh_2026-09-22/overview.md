# LLM Challenges — repository overview

This repository is a benchmark suite for coding agents. Each challenge is a self-contained specification. Agents write a solution next to that spec; scripts grade the runs and publish two generated reports plus a leaderboard in the root README.

The map below is the whole contract. Challenges are drawn once, as `challengeNN-<slug>/`, so the picture stays valid when another challenge is added. Run folders (`[harness]_[model]_[date]/`) are artifacts of those runs and are intentionally not on the diagram.

## Diagram

Source: [`overview.puml`](overview.puml). Render with PlantUML (`plantuml overview.puml`).

```plantuml
@startuml llm-challenges-overview
!theme blueprint
title LLM Challenges — repository overview

skinparam shadowing false
skinparam componentStyle rectangle
skinparam packageStyle rectangle
skinparam wrapWidth 170

package "llm-challenges" {
  [INSTRUCTIONS.md] as Instructions <<agent contract>>
  [package.json] as Package <<npm scripts>>

  package "challengeNN-<slug>/" as Challenge {
    [README.md] as Spec <<specification>>
    [optional input files] as Inputs <<named by that README>>
    [grader/\nreference + grade.ts] as Grader <<optional>>
  }

  package "scripts/" {
    [bench/run-challenge.sh] as Bench <<one isolated run>>
    [verify-challenges.ts] as Verify
    [grade-all.ts] as GradeAll
    [scoreboard.ts] as Scoreboard
    [leaderboard.ts] as Leaderboard
  }

  package "Checked-in reports" {
    [SCORES.md] as Scores <<generated>>
    [RESULTS.md] as Results <<generated>>
    [README.md\nleaderboard block] as Readme <<generated>>
  }

  [ci.yml] as CI <<.github/workflows>>
}

Instructions --> Spec : read the spec\nfor one challenge
Spec --> Inputs : only files\nthe spec names
Bench --> Spec : copy spec + inputs\ninto a clean workspace
Bench ..> Grader : not copied\n(hidden from the agent)
Verify --> Grader : reference must pass\nbuggy fixture must fail
GradeAll --> Grader : grade a run\nwhere a grader exists
GradeAll --> Scores : write
Scoreboard --> Results : write file list\nand durations
Leaderboard --> Scores : read grades
Leaderboard --> Readme : rewrite the block
Package --> Verify : npm run verify
Package --> Scoreboard : npm run scoreboard
Package --> Leaderboard : npm run leaderboard
CI --> Verify
CI --> Grader : tsgo --strict\non TypeScript references
CI --> Scoreboard : --check
CI --> Leaderboard : --check

@enduml
```

## How to read it

**What an agent is allowed to see.** `INSTRUCTIONS.md` tells the agent to read one challenge `README.md`, write deliverables in its own result folder, type-check with `tsgo` when the solution is TypeScript, and leave a duration marker. If the spec names an input file, that file sits beside the README. Nothing else in the challenge directory is part of the prompt.

**What a challenge directory contains.** Every challenge is `challengeNN-<slug>/` plus a `README.md`. Some specs also name an input fixture. Later challenges add a `grader/` with a reference solution and a `grade.ts` that scores a run. The grader is repository infrastructure; `scripts/bench/run-challenge.sh` does not copy it into the agent's workspace.

**How a run becomes a published number.** The bench script is a one-shot harness: it builds a clean workspace from the spec and its declared inputs, runs one agent, and harvests the new files. Three TypeScript tools then publish the outcome:

- `scripts/grade-all.ts` scores every run and writes `SCORES.md`. Where `grader/grade.ts` exists it uses that; otherwise it checks compilation or that the expected files are present.
- `scripts/scoreboard.ts` only inventories runs (file list and `duration-<seconds>-seconds.txt`) and writes `RESULTS.md`.
- `scripts/leaderboard.ts` reads `SCORES.md` and those durations and rewrites the leaderboard block in `README.md`.

`package.json` exposes the three commands CI and humans regenerate or check: `npm run verify`, `npm run scoreboard`, and `npm run leaderboard`. `grade-all.ts` and `run-challenge.sh` are invoked directly.

**What CI guarantees.** `.github/workflows/ci.yml` installs dependencies, runs `npm run verify`, type-checks the TypeScript reference solutions with `tsgo --strict`, and fails if `RESULTS.md` or the README leaderboard is stale (`scoreboard.ts --check`, `leaderboard.ts --check`). `verify-challenges.ts` is the infrastructure test: each grader must accept its own reference, and a known-bad fixture must be rejected. CI does not re-score model runs; it checks that the checked-in reports still match the scripts.

`plans/` holds local notes. It is not part of the agent contract and CI does not read it.
