# LLM Challenges — Repository Overview

A lightweight benchmark suite for comparing **(harness, model, quantisation)** tuples on
small, well-specified coding tasks. Each challenge ships its own self-contained
specification; each run of an LLM agent produces a single dated result folder
alongside the spec.

## Diagram

The PlantUML source is in [`overview.puml`](./overview.puml). Render it with any
PlantUML pipeline (CLI, server, or VS Code extension), e.g.:

```bash
plantuml overview.puml          # writes overview.png
plantuml -tsvg overview.puml    # writes overview.svg
```

> The diagram uses `!theme blueprint`, matching the repository's house style.

![Repository overview](./overview.svg)

## How to read it

- **`llm-challenges/`** is the repository root and contains the top-level
  `README.md`, `INSTRUCTIONS.md`, the npm manifest, and one folder per
  challenge.
- Each **`challengeNN-<slug>/`** holds a `README.md` (the spec) and one or
  more **result folders** named `[harness]_[model]_[quant]_[YYYY-MM-DD]/`.
- An **LLM agent** runs inside a **harness** (Claude Code, pi, qwen, aider, …),
  reads `INSTRUCTIONS.md` plus the relevant challenge `README.md`, then
  writes the deliverables directly into its own dated result folder.
- Each result folder also carries a `duration-<secs>-seconds.txt` marker
  recording how long the run took, created empty before any solution file is
  written and renamed when the challenge ends.
- Verification tooling differs per challenge: TypeScript challenges are
  type-checked with **`tsgo --strict`**, visual challenges run against
  **p5.js** in the browser, diagram challenges render with **PlantUML**.

## Conventions

| Aspect              | Rule                                                            |
| ------------------- | --------------------------------------------------------------- |
| Folder naming       | `[harness]_[model]_[quant]_[YYYY-MM-DD]/` (lowercase, hyphens)  |
| Deliverables        | Placed **directly** in the result folder — no nested wrappers   |
| Isolation           | Runs **must not** read sibling result folders                   |
| Timing              | `duration.txt` → `duration-<secs>-seconds.txt`                  |
| TS verification     | `npx tsgo --noEmit --strict --target ES2024 --module NodeNext` |

## Why the diagram is generic

The spec for this challenge calls for a structure that stays valid as new
challenges are added, so the diagram represents challenges as a single generic
`challengeNN-<slug>/` package rather than enumerating today's three. The
relationships and conventions stay correct whether the repo contains 3 or 30
challenges.
