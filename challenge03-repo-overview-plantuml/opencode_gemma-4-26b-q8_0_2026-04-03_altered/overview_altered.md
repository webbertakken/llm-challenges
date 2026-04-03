# Repository Overview

This repository contains TypeScript benchmark challenges for LLM agents. The root files define the repo workflow, and each challenge lives in its own `challengeNN-<slug>/` directory with a specification `README.md`.

## Structure

The diagram in `overview.puml` highlights the root docs, package metadata, and the generic challenge layout.

## Key Files

- `README.md`: Top-level repo intro and quick start.
- `INSTRUCTIONS.md`: Required workflow for LLM agents.
- `package.json` / `package-lock.json`: TypeScript tooling and dependency lockfile.
- `challengeNN-<slug>/README.md`: Per-challenge specification and deliverables.

## Diagram

```plantuml
!include overview.puml
```

The diagram intentionally omits solution result folders and keeps challenge directories generic so it remains valid as the repo grows.
