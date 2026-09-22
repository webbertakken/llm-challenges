# LLM Challenges - repository overview

This repository is a benchmark suite for LLM coding agents. Each challenge is a self-contained
specification; agents solve it in a dated result folder, and a small set of TypeScript scripts
grades the runs and publishes scoreboards.

> Diagram source: [`overview.puml`](overview.puml) (`!theme blueprint`). It is inlined below so
> Markdown viewers with PlantUML support render it directly; otherwise render it with
> `plantuml overview.puml`.

```plantuml
@startuml overview
!theme blueprint

title LLM Challenges - repository overview

skinparam componentStyle rectangle
skinparam packageStyle folder
skinparam nodesep 40
skinparam ranksep 50

actor "LLM agent\n(harness + model)" as agent
actor "Maintainer" as maintainer

package "llm-challenges/ (repo root)" as root {

  package "Agent-facing contract" as contract {
    file "INSTRUCTIONS.md" as instructions
    note right of instructions
      Step 1  identify: harness_model[_quant]_YYYY-MM-DD
      Step 2  read ONE challenge README
      Step 3  write deliverables into the result folder
      Step 4  verify with tsgo --strict (+ tsx tests)
      Step 5  record duration marker
      Rule: never read graders or other results
    end note
  }

  package "challengeNN-<slug>/  (one per challenge, numbered 01..NN)" as challenge {
    file "README.md\n(specification: objective,\nrequirements, deliverables,\nevaluation criteria)" as spec
    file "input files (optional)\ne.g. code under test,\nfunction to reverse-engineer" as inputs
    package "grader/ (optional, hidden from agents)" as grader {
      component "grade script" as gradeScript
      file "reference solution" as reference
    }
  }

  package "scripts/  (TypeScript, run with tsx)" as scripts {
    component "verify-challenges.ts\n(graders vs references,\nplus negative controls)" as verify
    component "grade-all.ts\n(grades every run)" as gradeAll
    component "scoreboard.ts\n(run overview)" as scoreboard
    component "leaderboard.ts\n(weighted scores, 100 pts)" as leaderboard
    component "bench/run-challenge.sh\n(isolated runner:\none harness, one challenge)" as runner
  }

  package "Generated reports" as reports {
    file "SCORES.md\n(per-challenge grades)" as scores
    file "RESULTS.md\n(runs, files, durations)" as results
    file "README.md\n(intro + leaderboard block)" as readme
  }

  package "Knowledge" as knowledge {
    folder "docs/results/\n(model interpretations)" as docs
    folder "plans/\n(work plans with checkboxes)" as plans
  }

  package "Tooling" as tooling {
    file "package.json\nnpm run verify | scoreboard | leaderboard" as pkg
    component "typescript (tsc)\n@typescript/native-preview (tsgo)\ntsx" as tsTools
    file ".github/workflows/ci.yml" as ci
  }
}

' Agent flow
agent --> instructions : follows
agent --> spec : reads
agent ..> tsTools : verifies with

' Challenge internals
gradeScript --> reference : validated against
spec ..> inputs : names

' Scripts and outputs
runner --> spec : copies into sandbox
runner --> inputs : copies into sandbox
verify --> gradeScript : runs
gradeAll --> gradeScript : runs
gradeAll --> scores : writes
scoreboard --> results : writes
leaderboard --> scores : reads
leaderboard --> readme : injects block into
readme ..> docs : links to

' Tooling
pkg --> scripts : npm scripts
ci --> verify : npm run verify
ci --> reference : tsgo --strict type-check
ci --> scoreboard : --check
ci --> leaderboard : --check
scripts ..> tsTools : run via tsx

maintainer --> plans : tracks work
maintainer --> docs : interprets results
maintainer --> runner : launches benchmarks

@enduml
```

## How the pieces fit together

| Area | What lives there | Role |
| --- | --- | --- |
| `INSTRUCTIONS.md` | The agent-facing contract | How an agent names its result folder, where to put files, how to verify (`tsgo --strict`) and how to record the duration marker. It also forbids peeking at graders or other runs. |
| `challengeNN-<slug>/` | `README.md` + optional inputs + optional `grader/` | One folder per challenge. The README is the **specification** (objective, requirements, deliverables, evaluation criteria). Some challenges ship input files (code under test, a function to reverse-engineer). Behaviourally graded challenges carry a hidden `grader/` with a grade script and a reference solution. |
| `scripts/` | TypeScript tooling run with `tsx` | `verify-challenges.ts` proves every grader accepts its reference solution (and rejects negative controls); `grade-all.ts` grades runs into `SCORES.md`; `scoreboard.ts` writes `RESULTS.md`; `leaderboard.ts` turns scores into a weighted 100-point leaderboard injected into `README.md`; `bench/run-challenge.sh` runs one agent on one challenge in an isolated sandbox. |
| Generated reports | `SCORES.md`, `RESULTS.md`, `README.md` leaderboard block | Derived data only; never edited by hand. |
| Knowledge | `docs/results/`, `plans/` | Human-written interpretation of model behaviour and checklists for benchmark campaigns. |
| Tooling | `package.json`, `.github/workflows/ci.yml` | `npm run verify / scoreboard / leaderboard`; CI verifies graders, strict-type-checks the reference solutions and fails when the generated reports are stale. |

## Reading the diagram

- **Top:** the two actors. The *LLM agent* only touches the contract, a challenge specification (and the
  inputs it names) and the TypeScript toolchain. The *maintainer* launches benchmarks and curates knowledge.
- **Middle:** `scripts/` is the engine: it feeds sandboxes from challenge folders, runs graders and writes reports.
- **Bottom:** challenge folders on one side (spec, inputs, hidden grader) and generated reports and knowledge
  on the other, so the flow reads *specification -> grading -> reporting*.
- The challenge folder is drawn generically as `challengeNN-<slug>/`: adding a new challenge only adds another
  instance of the same shape, so the diagram stays valid. Result folders are intentionally left out.
