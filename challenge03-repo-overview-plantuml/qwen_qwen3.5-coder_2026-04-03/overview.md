# LLM Challenges — Repository Overview

This repository is a benchmarking suite for evaluating Large Language Model (LLM) coding agents across different harnesses, models, and quantisation levels.

## Structure

```
llm-challenges/
├── README.md                  # Project overview and usage instructions
├── INSTRUCTIONS.md            # Standardised instructions for LLM agents
├── package.json               # TypeScript tooling (tsc, tsgo)
├── .gitignore                 # Excludes node_modules, IDE files, etc.
│
├── challenge01-deep-readonly/ # Challenge 1: Recursive utility types
│   ├── README.md              # Challenge specification
│   └── [harness]_[model]_[date]/  # Individual model solutions
│       ├── types.ts
│       ├── tests.ts
│       └── examples.ts
│
├── challenge02-solar-system/  # Challenge 2: p5.js creative coding
│   ├── README.md
│   └── [harness]_[model]_[date]/
│       ├── index.html
│       └── sketch.js
│
└── challenge03-repo-overview-plantuml/  # Challenge 3: Documentation
    ├── README.md
    └── [harness]_[model]_[date]/
        ├── overview.puml
        └── overview.md
```

## Architecture Diagram

![Repository Overview Diagram](overview.puml)

> **Note:** The PlantUML diagram (`overview.puml`) renders as a component diagram showing the repository's package structure, challenge categories, and solution folder conventions.

## Key Components

### Challenge Specifications

Each `challengeNN-<slug>/` directory contains a `README.md` that defines:
- **Objective** — what the model must build
- **Requirements** — specific features and constraints
- **Deliverables** — exact files the model must produce
- **Evaluation Criteria** — how solutions are scored

### Solution Folders

Every LLM run produces a uniquely named result folder following the pattern:

```
challengeNN/[harness]_[model]_[quantisation]_[YYYY-MM-DD]/
```

For example:
- `challenge01-deep-readonly/claude_sonnet-4_2026-04-03/`
- `challenge02-solar-system/pi_gemma-4-26b_q6k_2026-04-03/`

This naming convention enables direct comparison between different models on the same challenge.

### Tooling

- **TypeScript** (`package.json`) — provides `tsc` and `tsgo` for type-checking TypeScript solutions
- **p5.js** (CDN) — used by the solar system challenge for creative coding
- **PlantUML** — used by the repo overview challenge for diagram generation

## Challenge Categories

| # | Challenge | Category | Skills Tested |
|---|-----------|----------|---------------|
| 01 | Deep Readonly | TypeScript Types | Mapped types, recursion, conditional types |
| 02 | Solar System | Creative Coding | p5.js, animation, physics simulation |
| 03 | Repo Overview | Documentation | PlantUML, architecture analysis, Markdown |

## Workflow

1. Open a challenge harness with a specific LLM model
2. Confirm the model knows its identity (harness, model, quantisation)
3. Instruct it to read `INSTRUCTIONS.md` and solve the challenge
4. Verify the solution compiles/runs correctly
5. Compare results across models
