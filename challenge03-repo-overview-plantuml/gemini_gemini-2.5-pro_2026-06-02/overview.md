# Repository Overview

This document provides a high-level overview of the `llm-challenges` repository structure.

## Diagram

The following diagram illustrates the main components and their relationships.

![Repository Structure](./overview.puml)

## Explanation

The repository is structured to house a series of TypeScript benchmark challenges for LLM agents.

- **`challengeNN-<slug>/`**: Each challenge gets its own directory, containing a `README.md` with the instructions and any other necessary files. These are designed to be self-contained.
- **`scripts/`**: Contains helper scripts for tasks like verification and scoring.
- **`.github/workflows/`**: Holds the continuous integration (CI) configuration, which automates the verification of challenges.
- **`plans/`**: Contains markdown files for project planning and tracking.
- **Root Files**: The root of the repository contains configuration files (`package.json`, `.gitignore`) and primary documentation (`README.md`, `INSTRUCTIONS.md`). The `INSTRUCTIONS.md` file provides general rules for the LLM agents tackling the challenges.
