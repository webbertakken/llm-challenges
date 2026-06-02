# LLM Challenges — Repository Overview

This repository is a lightweight benchmark for comparing coding agents
(harness + model + quantisation combinations). It is deliberately small: a
shared **protocol**, a set of self-contained **challenge specifications**, and a
minimal **TypeScript toolchain** used to verify the type-level challenges. Every
agent run produces its own result folder, so many solutions can live
side-by-side and be compared.

## Diagram

The overview below is a PlantUML **package / deployment** diagram (theme
`blueprint`). It captures the committed repository structure and the workflow an
agent follows, rather than any individual solution.

The source lives in [`overview.puml`](overview.puml); a rendered copy is shown
here:

![LLM Challenges repository overview](repo-overview.svg)

<details>
<summary>PlantUML source (also in <code>overview.puml</code>)</summary>

```plantuml
@startuml repo-overview
!theme blueprint

title LLM Challenges — Repository Overview

skinparam linetype ortho
skinparam shadowing false
skinparam ranksep 55
skinparam nodesep 35
skinparam wrapWidth 220

actor "LLM Agent\n(harness · model · quant)" as agent

package "llm-challenges  —  git repository root" as root {

  file "INSTRUCTIONS.md" as instr <<protocol>>
  file "README.md" as rootReadme <<docs>>
  file "package.json\npackage-lock.json" as pkg <<toolchain>>
  file ".gitignore\nimg.png" as assets <<assets>>

  folder "challengeNN-<slug>/" as challenge <<challenge>> {
    file "README.md\nspecification + deliverables" as spec <<spec>>
  }

  node "node_modules/\ntsgo · typescript" as deps <<deps>>
}

' --- workflow the agent follows -------------------------------------------
agent --> instr     : 1 · read the protocol
agent --> spec      : 2 · read the challenge spec
agent ..> challenge : 3 · add a result folder\n(per naming convention)

' --- internal relationships ----------------------------------------------
rootReadme --> instr     : points to
instr ..> challenge      : defines result-folder\nnaming convention
spec --> pkg             : verified with tsgo\n(type-level challenges)
pkg --> deps             : installs

legend right
  == Stereotypes ==
  <<protocol>>   one-time setup, rules, verify & timing steps
  <<spec>>       a single challenge's requirements
  <<toolchain>>  TypeScript + tsgo (native-preview) verifier
  <<challenge>>  repeated generically as challengeNN-<slug>/
  == Result folders ==
  Each challengeNN-<slug>/ holds exactly one README.md.
  An agent adds its own subfolder named
  [harness]_[model]_[quant]_[YYYY-MM-DD]/
  containing the deliverables plus duration-<secs>-seconds.txt.
  Those generated result folders are deliberately not drawn.
endlegend

@enduml
```

</details>

## How to read it

- **`INSTRUCTIONS.md`** (`«protocol»`) is the entry point. It tells an agent how
  to identify itself, the exact result-folder naming convention, how to verify a
  solution, and how to record timing. `README.md` at the root simply points to
  it.
- **`challengeNN-<slug>/`** (`«challenge»`) is drawn once but stands for *every*
  challenge folder. Each one contains a single `README.md` (`«spec»`) holding
  that challenge's objective, requirements, deliverables and evaluation
  criteria. New challenges slot in by following the same pattern, so the diagram
  stays valid as the set grows.
- **`package.json` / `node_modules`** provide the verification toolchain —
  `typescript` and `tsgo` (the `@typescript/native-preview` compiler) — used to
  type-check the TypeScript challenges with the strict flags listed in
  `INSTRUCTIONS.md`.

## The agent workflow

1. **Read the protocol** — derive the result-folder name and the rules.
2. **Read the challenge spec** — the `README.md` inside a `challengeNN-<slug>/`.
3. **Write a result folder** — `[harness]_[model]_[quant]_[YYYY-MM-DD]/`
   containing the deliverables and a `duration-<secs>-seconds.txt` timing marker.

Generated result folders are intentionally **omitted** from the diagram: the
overview describes the repository's stable structure and its specifications, not
the per-run solutions that accumulate inside each challenge.

## Rendering the diagram

```bash
# SVG (scalable, used above)
java -jar plantuml.jar -tsvg overview.puml
# or PNG
java -jar plantuml.jar -tpng overview.puml
```

Both commands emit `repo-overview.*` (named after the `@startuml repo-overview`
id).
