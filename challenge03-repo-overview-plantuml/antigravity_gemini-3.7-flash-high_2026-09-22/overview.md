# LLM Challenges Benchmark Suite — Repository Architecture Overview

## Summary

The **LLM Challenges** benchmark repository is an automated, multi-agent evaluation harness designed to test AI programming capabilities across diverse software engineering disciplines (advanced TypeScript type-level programming, algorithmic simulations, creative coding, bug remediation, reverse engineering, and formal type systems).

Each challenge is structured as an isolated, self-contained module governed by root-level orchestration instructions.

---

## Architectural PlantUML Diagram

```plantuml
@startuml
!theme blueprint
skinparam shadowing false
skinparam roundcorner 8
skinparam defaultFontName "Helvetica, Arial, sans-serif"

title LLM Challenges Benchmark Suite — Repository Architecture

package "Repository Root" as Root {
    file "INSTRUCTIONS.md" as Instructions <<Orchestration>> {
        * Agent Identification Rules
        * Execution Lifecycle & Timing
        * Compilation & Verification Commands
    }

    file "package.json / tsconfig.json" as ProjectConfig <<Tooling>> {
        * TypeScript / tsgo Compiler Settings
        * Runtime Execution Engines
    }

    package "challengeNN-<slug>/" as ChallengeModule <<Generic Challenge Suite>> {
        file "README.md" as ChallengeSpec <<Specification>> {
            * Challenge Objective & Rules
            * Required Deliverables
            * Evaluation Criteria
            * Difficulty & Topic Tags
        }

        folder "Challenge Inputs / Assets" as Inputs <<Optional>> {
            file "input.* / starter.*" as InputFiles
        }

        ChallengeSpec ..> InputFiles : "references"
    }

    package "Evaluation & Benchmark Harness" as Harness <<Framework>> {
        card "Agent Execution" as Runner {
            :Read INSTRUCTIONS.md;
            :Read Challenge README.md;
            :Implement Deliverables;
            :Verify Type Safety & Tests;
            :Record Benchmark Timing;
        }
    }
}

Instructions -[#38bdf8]-> Runner : "governs execution"
ChallengeSpec -[#38bdf8]-> Runner : "defines task contract"
ProjectConfig -[#38bdf8]-> Runner : "provides type checking"

@enduml
```

---

## Repository Structure & Mechanics

1. **Root Orchestration (`INSTRUCTIONS.md`)**:
   - Defines strict isolation boundaries and autonomous agent execution protocols.
   - Specifies identity-based result directory conventions (`[harness]_[model]_[quantisation]_[YYYY-MM-DD]`).
   - Standardizes timing instrumentation via start/duration marker files (`duration.txt` / `duration-<secs>-seconds.txt`).
   - Details rigorous compilation and verification commands via TypeScript (`tsgo` / `tsc` / `tsx`).

2. **Generic Challenge Modules (`challengeNN-<slug>/`)**:
   - **Specification (`README.md`)**: Contains objectives, input specifications, constraints, required deliverable filenames, and scoring criteria.
   - **Inputs / Assets (Optional)**: Provides challenge-specific test data, starter templates, or reverse-engineering targets.

3. **Evaluation Lifecycle**:
   - **Isolation**: Agents solve challenges from first principles without cross-referencing grading harnesses or peer results.
   - **Verification**: Solutions are validated via strict compiler flags (`--strict`, `--noEmit`, `ES2024`, `NodeNext`) and executable test harnesses.
