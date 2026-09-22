# LLM Challenges - repository overview

This repository is a benchmark suite for LLM coding agents. It holds a set of
self-contained TypeScript challenges, the rules an agent must follow to attempt
them, and the tooling that verifies, grades and ranks the submissions.

The diagram below is the source in [`overview.puml`](./overview.puml); render it with
`plantuml overview.puml` or any Markdown viewer that understands PlantUML fences.

```plantuml
@startuml llm-challenges-overview
!theme blueprint
title LLM Challenges - repository overview

skinparam linetype polyline
skinparam packageStyle rectangle
skinparam defaultTextAlignment center
skinparam ArrowThickness 1.2

actor "LLM agent\n(harness + model)" as Agent
actor "Maintainer /\nCI" as Maintainer

package "Repository root" as Root {
  file "INSTRUCTIONS.md\n<i>rules every agent follows:</i>\n<i>identify, pick, solve, verify, time</i>" as Instructions
  file "README.md\n<i>introduction + leaderboard</i>" as RootReadme
  file "RESULTS.md\n<i>per-run results</i>" as Results
  file "SCORES.md\n<i>aggregated scores</i>" as Scores
  file "package.json\n<i>npm scripts: verify, scoreboard, leaderboard</i>" as PackageJson
  folder ".github/workflows/" as Workflows {
    file "ci.yml" as Ci
  }
}

package "challengeNN-<slug>/\n<i>one folder per challenge, numbered 01..NN</i>" as Challenge {
  file "README.md\n<i>the specification:</i>\n<i>objective, requirements,</i>\n<i>deliverables, evaluation criteria</i>" as Spec
  artifact "input files (optional)\n<i>e.g. a buggy module or an</i>\n<i>obfuscated script to analyse</i>" as Inputs
  folder "grader/ (optional)" as Grader {
    file "grade.ts\n<i>scores a submission</i>" as Grade
    file "reference-*.ts\n<i>reference answer</i>" as Reference
    file "spec.ts / cases.ts\n<i>machine-readable cases</i>" as Cases
  }
}

package "scripts/" as Scripts {
  file "verify-challenges.ts\n<i>npm run verify</i>" as Verify
  file "grade-all.ts\n<i>runs every grader</i>" as GradeAll
  file "scoreboard.ts\n<i>npm run scoreboard</i>" as Scoreboard
  file "leaderboard.ts\n<i>npm run leaderboard</i>" as Leaderboard
  folder "bench/" as Bench {
    file "run-challenge.sh\n<i>launches an agent on a challenge</i>" as RunChallenge
  }
}

package "docs/ and plans/" as Docs {
  file "docs/results/interpretations.md\n<i>how to read the results</i>" as Interpretations
  file "plans/*.md\n<i>roadmap and run planning</i>" as Plans
}

node "Toolchain (devDependencies)" as Toolchain {
  component "tsgo\n<i>@typescript/native-preview</i>" as Tsgo
  component "tsx" as Tsx
  component "typescript" as Typescript
}

' --- how an agent moves through the repo ---
Agent --> Instructions : 1. reads the rules
Agent --> Spec : 2. reads one challenge spec
Spec ..> Inputs : names the inputs\nthe agent may read
Agent --> Tsgo : 4. type-checks\nits deliverables
Agent --> Tsx : 4. runs runtime tests

' --- how results are verified and scored ---
Maintainer --> RunChallenge : benchmarks a model
RunChallenge --> Agent : drives
Ci --> Verify : runs on push
PackageJson --> Verify
PackageJson --> Scoreboard
PackageJson --> Leaderboard
Verify --> Tsgo : compiles every\nsubmission with
GradeAll --> Grade : invokes per challenge
Grade --> Reference : compares against
Grade --> Cases : checks
Scoreboard --> Scores : writes
Leaderboard --> RootReadme : updates the\nleaderboard table
Results ..> Interpretations : explained by
Toolchain -[hidden]down- Docs

legend right
  |= Element |= Meaning |
  | package | top-level folder |
  | file / artifact | a file or set of files |
  | solid arrow | reads, runs or writes |
  | dashed arrow | references |
  Solution result folders
  (<i>challengeNN/[harness]_[model]_[quant]_[date]/</i>)
  live inside each challenge but are omitted here.
endlegend

@enduml
```

## How the repository is organised

| Area | What lives there |
| --- | --- |
| Repository root | `INSTRUCTIONS.md` (the rules every agent follows), `README.md` (introduction and leaderboard), `RESULTS.md` and `SCORES.md` (recorded outcomes), `package.json` (npm scripts and the toolchain), `.github/workflows/ci.yml` |
| `challengeNN-<slug>/` | One folder per challenge, numbered from `01`. Its `README.md` is the specification: objective, requirements, deliverables and evaluation criteria. Some challenges ship input files the spec names explicitly (a module to debug, a script to reverse-engineer). Some carry a `grader/` with `grade.ts`, a reference answer and machine-readable cases. |
| `scripts/` | Repository automation: `verify-challenges.ts` type-checks submissions, `grade-all.ts` runs each challenge grader, `scoreboard.ts` and `leaderboard.ts` roll results up into `SCORES.md` and the root `README.md`, and `bench/run-challenge.sh` launches an agent on a challenge. |
| `docs/` and `plans/` | `docs/results/interpretations.md` explains how to read the results; `plans/*.md` hold roadmap and run planning notes. |
| Toolchain | Dev dependencies only: `tsgo` (`@typescript/native-preview`) for type-checking, `tsx` for running tests, and `typescript`. |

## How a challenge is attempted

1. The agent reads `INSTRUCTIONS.md` and derives its result folder name,
   `challengeNN/[harness]_[model]_[quantisation]_[YYYY-MM-DD]/`.
2. It reads exactly one `challengeNN-<slug>/README.md`, plus any input file that
   spec names. Graders, other result folders and the results documents are
   off limits so every run is solved from first principles.
3. It writes the deliverables directly into its result folder.
4. It verifies with `tsgo --noEmit --strict` and, where the spec has runtime tests,
   `tsx tests.ts`, and records how long the attempt took in a
   `duration-<seconds>-seconds.txt` marker.

## How results flow back

Maintainers (or CI on push) run `npm run verify` to make sure every submission
compiles, `grade-all.ts` to score the challenges that have a grader, and then
`npm run scoreboard` and `npm run leaderboard` to refresh `SCORES.md` and the
leaderboard table in `README.md`. `docs/results/interpretations.md` gives the
reading guide for those numbers.

## Deliberate omissions

- Individual challenges are not listed; `challengeNN-<slug>/` stands for all of
  them, so the diagram stays valid as challenges are added.
- Solution result folders inside each challenge are left out; the diagram shows
  the repository, the challenges and their specifications only.
