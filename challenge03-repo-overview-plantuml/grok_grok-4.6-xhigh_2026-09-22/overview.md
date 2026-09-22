# LLM Challenges — Repository Overview

This repository is a **TypeScript benchmark suite for LLM coding agents**. Each challenge is a self-contained folder with a human-readable specification. Agents follow a shared playbook, write their deliverables next to that spec, and type-check against the same `tsgo` flags. Scoring and CI sit outside the challenge folders so new challenges can be added without changing the overall shape of the repo.

The canonical diagram source is [`overview.puml`](./overview.puml). Result folders such as `<harness>_<model>_<date>/` are **intentionally omitted**: they are per-run artefacts, not part of the suite’s structure.

## Structure

```plantuml
@startuml llm-challenges-structure
!theme blueprint
title LLM Challenges — Repository Structure

skinparam wrapWidth 220
skinparam shadowing false
skinparam packageStyle rectangle
skinparam defaultFontSize 13

package "llm-challenges/" as root {
  together {
    file "INSTRUCTIONS.md" as instructions
    file "package.json" as pkg
  }

  package "challengeNN-<slug>/" as challenge {
    file "README.md" as spec
    file "named inputs\n(optional)" as inputs
  }

  package "scripts/" as scripts {
    component "verify-challenges.ts" as verify
    component "scoreboard.ts" as scoreboard
    component "leaderboard.ts" as leaderboard
    component "bench/run-challenge.sh" as bench
  }

  package ".github/workflows/" as github {
    component "ci.yml" as ci
  }

  folder "docs/" as docs
}

instructions -down-> spec : "agent playbook\npoints at each spec"
spec -down-> inputs : "README may name\nfiles to read"
pkg -down-> scripts : "npm run verify\nnpm run scoreboard\nnpm run leaderboard"
ci -down-> pkg : "npm ci, then\nverify + scoreboard checks"

note bottom of challenge
  New challenges follow this layout.
  Do not enumerate challenge01, challenge02, …
  in diagrams — the glob stays valid as the
  suite grows.

  Agent result folders (harness_model_date)
  sit beside the spec but are omitted here:
  they are run artefacts, not the suite itself.
end note

note right of instructions
  Identity → read README → write files
  directly into the results folder →
  npx tsgo --strict → optional npx tsx tests.ts
  → duration-<secs>-seconds.txt
end note

@enduml
```

| Path | Role |
| --- | --- |
| `INSTRUCTIONS.md` | Agent playbook: folder naming, allowed inputs, `tsgo` flags, timing files |
| `package.json` | Tooling entry points (`verify`, `scoreboard`, `leaderboard`) plus `tsx` / `typescript` / `tsgo` |
| `challengeNN-<slug>/` | One challenge. **Always** has `README.md`. **Sometimes** ships extra files the README names as inputs |
| `challengeNN-<slug>/README.md` | Objective, requirements, deliverables, evaluation criteria |
| `scripts/` | Verification, scoreboard, leaderboard, and bench runner |
| `.github/workflows/ci.yml` | Installs deps, runs `npm run verify`, and checks generated scoreboard files |
| `docs/` | Supporting documentation (not part of a challenge spec) |

Challenges are shown as the glob `challengeNN-<slug>/` so this overview stays correct when challenges are added or renamed.

## Agent workflow

An agent solving a challenge does **not** browse the rest of the suite. It reads `INSTRUCTIONS.md`, the current challenge `README.md`, and only those extra files the README names.

```plantuml
@startuml llm-challenges-workflow
!theme blueprint
title LLM Challenges — Agent and Tooling Workflow

actor "LLM Agent" as agent
participant "INSTRUCTIONS.md" as instr
participant "challengeNN-<slug>/README.md" as readme
participant "Named inputs" as named
participant "Result files" as results
participant "tsgo / tsx" as check
participant "CI (ci.yml)" as ci

agent -> instr : read playbook
agent -> readme : read specification only
readme -> named : optional, if named
agent -> results : write deliverables\n(no nested solution/ folder)
agent -> check : type-check (--strict, ES2024, NodeNext)
agent -> check : run runtime tests when specified
agent -> results : write duration-<secs>-seconds.txt

ci -> check : npm run verify
ci -> ci : scoreboard / leaderboard --check

note over agent, results
  Result folders are per-run artefacts and are
  not part of the structural overview.
end note

@enduml
```

1. **Identify** — form the results folder name from harness, model, optional quantisation, and date.
2. **Specify** — read `challengeNN-<slug>/README.md` (and named inputs only).
3. **Deliver** — write files *directly* into that results folder (never a nested `solution/`).
4. **Verify** — `npx tsgo --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext`, then `npx tsx tests.ts` when the spec includes runtime tests.
5. **Time** — start with `duration.txt`, finish as `duration-<secs>-seconds.txt`.

CI reuses the same Node tooling: `npm ci`, `npm run verify`, a strict `tsgo` pass over reference sources, and `--check` on the scoreboard/leaderboard scripts. That pipeline grades the suite; it is not something an agent needs to open in order to solve a challenge.
