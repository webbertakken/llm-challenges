# Repository Architecture Overview

This repository is a framework for evaluating LLM agent performance on specific coding challenges. It contains guidelines for agents, scripts to evaluate their output, and modular challenge directories.

## Core Components

1. **Documentation**: Files like `README.md`, `INSTRUCTIONS.md`, and `RESULTS.md` coordinate the benchmarking process.
2. **Challenge Directories (`challengeNN-<slug>/`)**: Each challenge is self-contained with its own specification (`README.md`) and any necessary auxiliary files. The structure generically supports adding new challenges without altering the broader architecture. 
3. **Scripts (`scripts/`)**: TypeScript utilities (`verify-challenges.ts` and `scoreboard.ts`) that evaluate the agents' solutions and tabulate the results.
4. **CI/CD (`.github/workflows/`)**: Automates the execution of verification and scoring scripts.

## Diagram

The PlantUML diagram below outlines the primary structure and relationships between these components, intentionally omitting individual agent result folders for generalized clarity.

```plantuml
@startuml
!theme blueprint

skinparam componentStyle rectangle

folder "LLM Challenges Repository" {
  
  folder "Documentation" {
    file "README.md" as readme
    file "INSTRUCTIONS.md" as instructions
    file "RESULTS.md" as results
  }

  file "package.json" as pkg

  folder ".github/workflows/" {
    file "ci.yml" as ci
  }

  folder "scripts/" {
    file "verify-challenges.ts" as verify
    file "scoreboard.ts" as scoreboard
  }

  folder "challengeNN-<slug>/" as challenges {
    file "README.md (Spec)" as chal_readme
    file "Auxiliary Files" as aux_files
  }

}

ci --> verify : "Runs"
ci --> scoreboard : "Runs"

scoreboard --> results : "Updates"
verify --> challenges : "Validates solutions in"
scoreboard --> challenges : "Reads metadata from"

instructions --> challenges : "Guides agent behavior in"

@enduml
```
