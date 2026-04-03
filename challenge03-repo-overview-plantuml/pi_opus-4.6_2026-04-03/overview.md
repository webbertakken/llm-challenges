# llm-challenges — Repository Overview

## Diagram

```plantuml
!include overview.puml
```

> To render the diagram, use the [PlantUML online server](https://www.plantuml.com/plantuml/uml/) or a local PlantUML installation:
> ```bash
> plantuml overview.puml   # produces overview.png
> ```

## Repository Structure

**llm-challenges** is a benchmark suite for evaluating LLM coding agents. It contains a set of self-contained challenges, each in its own directory, along with standardised instructions for how agents should approach them.

### Root Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview and quick-start guide |
| `INSTRUCTIONS.md` | Prescriptive rules for LLM agents: how to identify themselves, read a challenge, write solutions into a results folder, verify correctness, and record timing |
| `package.json` | Node project config — declares `typescript` and `@typescript/native-preview` (tsgo) as dev dependencies |
| `.gitignore` | Excludes `node_modules/`, `dist/`, IDE files, and logs |

### Challenges

Each challenge lives in a `challengeNN-<slug>/` directory containing a `README.md` specification.

| Challenge | Topic | Key Deliverables |
|-----------|-------|-----------------|
| **01 — Deep Readonly** | TypeScript recursive utility types | `types.ts`, `tests.ts`, `examples.ts` |
| **02 — Solar System** | p5.js creative coding / animation | `index.html`, `sketch.js` |
| **03 — Repo Overview** | PlantUML documentation diagram | `overview.puml`, `overview.md` |

### Workflow

1. An LLM agent is pointed at the repo and told to solve a challenge.
2. It reads `INSTRUCTIONS.md` to learn the rules.
3. It reads the challenge's `README.md` for the specification.
4. It writes its solution files directly into its results folder (`challengeNN/<harness>_<model>_<date>/`).
5. It verifies correctness (e.g., `tsgo --noEmit` for TypeScript challenges).
6. It records the elapsed time in a `duration-N-seconds.txt` file.

This structure makes it straightforward to compare solutions across different agents and models by examining their respective result folders side by side.
