# Repository overview

This document gives a high-level picture of how the `llm-challenges`
repository is organised and how its parts relate. The accompanying PlantUML
diagram (`overview.puml`) renders the same structure visually.

## What this repository is

A benchmark suite of TypeScript coding challenges for LLM coding agents. Each
challenge is a self-contained folder with a `README.md` specification, optional
input files, an optional `grader/` (ground-truth checker), and one result
folder per agent/model/date run. A set of scripts grades and scores those runs.

## Structure at a glance

| Area | Purpose |
| --- | --- |
| `INSTRUCTIONS.md` | The rules every agent must follow (naming, verification, timing). |
| `README.md` | Top-level project documentation. |
| `package.json` | Scripts that drive verification, grading, scoreboard and leaderboard. |
| `challengeNN-<slug>/` | One folder per challenge: a `README.md` spec, optional inputs (`toolkit.ts`, `mystery.mjs`), an optional `grader/`, and result folders. |
| `scripts/` | The tooling: `verify-challenges.ts`, `grade-all.ts`, `scoreboard.ts`, `leaderboard.ts`, and a `bench/` helper. |
| `plans/` | Planning notes (benchmark runs, observations, scoreboard ideas). |
| `docs/results/` | Collected/aggregated results. |
| `.github/workflows/ci.yml` | CI that runs verification and grading on push. |

## The diagram

```plantuml
@startuml
!theme blueprint

title LLM Challenges — repository overview

package "llm-challenges (root)" {
  [INSTRUCTIONS.md] as INSTRUCTIONS
  [README.md] as README
  [package.json] as PKG
  [package-lock.json] as LOCK
  [.gitignore] as GITIGNORE

  package ".github/workflows/" {
    [ci.yml] as CI
  }
}

package "scripts/ (tooling)" {
  [verify-challenges.ts] as VERIFY
  [grade-all.ts] as GRADE
  [scoreboard.ts] as SCORE
  [leaderboard.ts] as LEADER
  folder "bench/" as BENCH
}

package "plans/ (planning notes)" {
  [benchmark-runs-and-new-challenges.md] as PLAN1
  [local-gemini-openai-runs.md] as PLAN2
  [model-observations-and-scoreboard.md] as PLAN3
}

package "docs/ (documentation)" {
  folder "results/" as RESULTS
}

package "challengeNN-<slug>/ (one per challenge)" {
  [README.md] as C_README
  [grader/] as C_GRADER
  [input files] as C_INPUT
  [<run>_<model>_<date>/ result folders] as C_SOLN
}

PKG --> VERIFY : "verify"
PKG --> SCORE : "scoreboard"
PKG --> LEADER : "leaderboard"

CI --> VERIFY : runs on push
CI --> GRADE : runs on push

VERIFY --> C_SOLN : type-checks solutions
GRADE --> C_GRADER : scores each challenge
SCORE --> RESULTS : aggregates
LEADER --> RESULTS : reads

C_GRADER --> C_SOLN : grades
C_README --> C_SOLN : specifies deliverables
INSTRUCTIONS --> C_README : agent rules

GRADE --> BENCH : batch runs
VERIFY --> GRADE : per-challenge

@enduml
```

### Key relationships

- **`package.json` → `scripts/`** — the npm scripts (`verify`, `scoreboard`,
  `leaderboard`) are thin entry points into the corresponding TypeScript
  scripts.
- **`INSTRUCTIONS.md` → each `challengeNN-<slug>/README.md`** — the shared
  agent rules govern how a challenge is read and solved.
- **`challengeNN-<slug>/README.md` → result folders** — a challenge spec
  defines the deliverables that agents place in their result folders.
- **`grader/` → result folders** — graders check a run's solution against
  ground truth.
- **`scripts/` → `docs/results/`** — scoreboard and leaderboard aggregate the
  graded outcomes.
- **`.github/workflows/ci.yml` → `scripts/`** — CI verifies and grades on
  every push.

## Notes

- Challenges are shown **generically** as `challengeNN-<slug>/` so the diagram
  stays accurate as new challenges are added; no individual challenge names are
  hard-coded.
- Agent **result folders are intentionally omitted** from the structural
  overview; the diagram describes where they live without listing them.
- The diagram uses `!theme blueprint` for a consistent, print-friendly look.
