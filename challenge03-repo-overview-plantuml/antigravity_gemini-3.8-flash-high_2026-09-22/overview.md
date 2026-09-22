# Repository Architecture Overview

## Summary

The **LLM Challenges Suite** is an autonomous benchmarking harness designed to evaluate code generation, type system reasoning, creative coding, bug fixing, and software design across modern LLM agents.

The repository follows a clean, modular, challenge-driven architecture where each challenge is completely decoupled and self-contained.

---

## Architectural Diagram

The diagram below outlines the structural hierarchy, specification mechanisms, and verification workflows of the repository.

```plantuml
@startuml
!theme blueprint
skinparam defaultFontName sans-serif

package "LLM Challenges Benchmark Repository" as Repo {
  
  file "INSTRUCTIONS.md" as Instructions <<Root Guide>> {
    [Benchmark Instructions & Protocol]
    [Run Directory Conventions]
    [Verification & Timing Protocol]
  }

  file "package.json" as PackageConfig <<Config>> {
    [TypeScript / tsgo Dependencies]
    [Execution Runtime Config]
  }

  package "challengeNN-<slug>/" as ChallengeDir <<Generic Challenge Suite>> {
    file "README.md" as ChallengeSpec <<Specification>> {
      [Objective & Problem Statement]
      [Technical Requirements & Rules]
      [Deliverables Specification]
      [Evaluation Criteria & Constraints]
    }

    folder "Inputs & Assets (Optional)" as ChallengeInputs <<Problem Data>> {
      [Input Data / Schemas / Fixtures]
    }

    folder "[harness]_[model]_[quantisation]_[YYYY-MM-DD]/" as RunResult <<Benchmark Run>> {
      [Solution Implementations]
      [Verification Tests & Assertions]
      [duration-<N>-seconds.txt]
    }
  }

  package "Tooling & Verification Pipeline" as Tooling {
    component "tsgo / tsc" as Compiler <<Type Checker>>
    component "tsx / node" as TestRunner <<Runtime Validator>>
  }

  Instructions .down.> ChallengeDir : defines execution rules
  ChallengeSpec -down-> ChallengeInputs : references
  ChallengeSpec -down-> RunResult : specifies deliverables
  RunResult .down.> Compiler : validated by
  RunResult .down.> TestRunner : executed by
}

note right of ChallengeDir
  Challenges are organized modularly:
  - Each challenge is self-contained in challengeNN-<slug>/
  - README.md defines exact deliverables and constraints
  - Solutions are placed directly in the designated model run folder
  - Duration markers track execution efficiency
end note

@enduml
```

---

## Key Components

### 1. Root Level Protocol (`INSTRUCTIONS.md`, `package.json`)
- **`INSTRUCTIONS.md`**: Provides the standardized evaluation protocol for all agent runs. It defines naming conventions for evaluation folders (`[harness]_[model]_[quantisation]_[YYYY-MM-DD]`), compilation commands using `tsgo`, runtime test execution instructions, and precise timing marker rules.
- **`package.json`**: Configures the compilation and runtime toolchain (including TypeScript / `tsgo` and execution engines).

### 2. Challenge Suites (`challengeNN-<slug>/`)
Every challenge follows a uniform layout:
- **`README.md`**: The authoritative specification document containing the problem statement, technical requirements, edge case expectations, deliverables list, and grading criteria.
- **Problem Inputs (Optional)**: Fixtures, raw data, or initial code files required for the task.
- **Evaluation Run Folders**: Each benchmark run places deliverables directly into a dedicated folder tagged by harness, model, and date.
- **Duration Markers**: Tracks the benchmark execution time via `duration-<secs>-seconds.txt`.

### 3. Tooling and Verification Pipeline
- **`tsgo` / `tsc`**: Validates strict compilation, zero type errors, and recursive type constraints under modern ECMAScript targets (`--target ES2024 --module NodeNext`).
- **`tsx` / `node`**: Executes runtime test suites and assertion harnesses.
