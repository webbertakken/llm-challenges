# Repository Overview: llm-challenges

This repository contains a collection of coding challenges used for benchmarking LLM agents. It is designed to evaluate various model-harness combinations across different domains, from recursive utility types to creative coding and reverse engineering.

## Repository Structure

The project follows a modular structure where each challenge is self-contained:

- **Root Directory**: Contains core documentation (`README.md`, `INSTRUCTIONS.md`, `RESULTS.md`) and configuration (`package.json`).
- **`.github/workflows`**: Houses the CI/CD pipeline (`ci.yml`) which ensures the integrity of challenges and graders.
- **`challengeNN-<slug>/`**: Each folder represents a unique challenge. These contain the challenge specification (`README.md`) and necessary input files. Results from various LLM runs are stored in subdirectories named after the harness and model (ignored in the diagram for clarity).
- **`scripts/`**: Utility scripts for administrative tasks:
  - `scoreboard.ts`: Regenerates `RESULTS.md` from the data in challenge result folders.
  - `verify-challenges.ts`: A CI check that validates graders and reference solutions.
- **`plans/`**: Documentation tracking future challenges and benchmark run strategies.

## High-Level Architecture

The following diagram illustrates the relationship between the project components:

![Repository Overview](overview.puml)

---

*Note: The diagram utilizes the generic `challengeNN-<slug>/` placeholder to represent the evolving list of challenges.*
