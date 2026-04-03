# LLM Challenges — Repository overview

## Diagram

```plantuml
!include ./overview.puml
```

![Repository overview](overview.puml)

## Structure

The **llm-challenges** repo is a lightweight benchmarking suite for comparing LLM coding agents across different harness/model combinations.

### Root files

- **README.md** — Usage guide showing how to run a challenge (prompt template, expected output)
- **INSTRUCTIONS.md** — The contract that LLM agents must follow: self-identification, folder naming (`[harness]_[model]_[quantisation]_[YYYY-MM-DD]`), verification steps, and timing protocol
- **package.json** — Minimal dev dependencies (TypeScript 5.x, tsgo 7.x) for type-checking challenge solutions

### Challenge folders

Each challenge lives in a `challengeNN-<slug>/` directory containing:

- **README.md** — Full specification: objective, requirements, deliverables, and evaluation criteria
- **Result subfolders** — One per agent run, named by the convention in INSTRUCTIONS.md. Each contains the solution files specified by the challenge, plus a `duration-N-seconds.txt` timing record

### Workflow

1. A user opens their chosen **harness** (Claude Code, Pi, Aider, Cursor, etc.) with a specific model
2. The user issues the standard prompt: *"Read INSTRUCTIONS.md of the llm-challenges repo, then do challenge N"*
3. The LLM agent reads INSTRUCTIONS.md for rules, then the challenge README for the spec
4. The agent creates its result folder, writes the solution, and records its elapsed time
5. Results from different agent/model combinations sit side by side for easy comparison
