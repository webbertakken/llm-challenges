# LLM Challenges Repository Overview

This repository contains a lightweight benchmark suite for evaluating LLM agents across different harness-model combinations.

## Repository Structure

The repo is organized around **7 challenges** that probe different capabilities:

### Core Files
- `README.md` — Project overview and how to use the challenges
- `INSTRUCTIONS.md` — Detailed instructions for agents solving challenges
- `RESULTS.md` — Auto-generated summary of all benchmark runs
- `package.json` — Dependencies and scripts

### Challenge Organization
Each challenge follows a consistent structure:

| Challenge | Focus Area | Grading Method |
|-----------|------------|----------------|
| 01 | Deep readonly utility types | `tsgo --strict` |
| 02 | Creative coding (p5.js solar system) | Visual/manual review |
| 03 | Repo comprehension & PlantUML | Manual assessment |
| 04 | Bug detection & runtime semantics | Objective grader |
| 05 | Code obfuscation & equivalence | Objective grader |
| 06 | Type-level parsing & arithmetic | Objective grader |
| 07 | Type-level lambda normaliser | Objective grader |

### Key Components
- `scripts/` — Tooling for verification and scoreboard generation
- `plans/` — Work plans and documentation
- `.github/workflows/` — CI/CD configuration
- `grader/` folders in challenges 04-07 contain objective test suites

### Result Folders
Each model-harness combination produces a result folder named:
```
challengeNN-[model]/[model]_[quantisation]_[YYYY-MM-DD]/
```

## Diagram

![](/home/webber/Repositories/llm-challenges/challenge03-repo-overview-plantuml/pi_deltacoder-9b_q8_2026-06-02/overview.puml)

## Usage

To verify solutions:
```bash
npx tsx scripts/verify-challenges.ts
npx tsx scripts/scoreboard.ts
```

## License

MIT
