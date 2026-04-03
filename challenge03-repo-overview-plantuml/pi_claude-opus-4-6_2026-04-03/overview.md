# llm-challenges — Repository Overview

## Diagram

```plantuml
!include overview.puml
```

![Repo Overview](overview.puml)

## Structure

**llm-challenges** is a benchmarking repository that pits different LLM coding agents against a set of TypeScript challenges.

### Root Files

| File | Purpose |
|---|---|
| `README.md` | Project introduction and quick-start guide |
| `INSTRUCTIONS.md` | Workflow rules for LLM agents: how to identify themselves, solve challenges, verify solutions, and record timing |
| `package.json` | Declares dev dependencies — TypeScript 5.7+ and the native TypeScript preview (`tsgo`) used for compilation checks |
| `.gitignore` | Excludes `node_modules/`, build artifacts, IDE files, and logs |

### Challenges

Each challenge lives in a folder named `challengeNN-<slug>/` (e.g. `challenge01-deep-readonly/`, `challenge02-solar-system/`). Inside is a single `README.md` that fully specifies the problem, deliverables, and evaluation criteria.

### Agent Results

When an LLM agent solves a challenge, it creates a results folder directly inside the challenge directory:

```
challengeNN-<slug>/[harness]_[model]_[YYYY-MM-DD]/
```

This folder contains:

- **Solution files** — the deliverables specified by the challenge README
- **`duration-N-seconds.txt`** — a timing marker recording how many seconds the agent took

### Dependencies

The repo uses two TypeScript toolchains installed via npm:

- **typescript ^5.7** — standard TypeScript compiler
- **@typescript/native-preview ^7.0** (`tsgo`) — used to verify solutions compile with `npx tsgo --noEmit --strict`

### Workflow

1. An agent reads `INSTRUCTIONS.md` to learn the process
2. It reads the challenge's `README.md` for the specification
3. It writes solution files into its own timestamped results folder
4. It verifies compilation with `tsgo`
5. It records elapsed time in a `duration-N-seconds.txt` file
