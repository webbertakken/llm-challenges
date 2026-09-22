# Repository Overview

This repository is designed as an automated benchmark suite for testing Large Language Model (LLM) agents on various software engineering tasks. 

Below is an overview of the repository's structure:

```plantuml
@startuml
!theme blueprint

skinparam componentStyle rectangle

package "LLM Challenges Repository" {
    
    file "INSTRUCTIONS.md" as Instructions
    note right of Instructions
        Core rules, setup, 
        and validation commands 
        for all agents.
    end note
    
    folder "challengeNN-<slug>/" as ChallengeDir {
        file "README.md" as ChallengeReadme
        note right of ChallengeReadme
            Challenge-specific objective,
            requirements, and deliverables.
        end note
        
        file "Inputs..." as ChallengeInputs
        note right of ChallengeInputs
            Optional starter code or 
            data provided for the challenge.
        end note
        
        ChallengeReadme -[hidden]down- ChallengeInputs
    }
    
    Instructions -down-> ChallengeDir : "Dictates general workflow for"
}

@enduml
```

## Structure Explanation

*   **`INSTRUCTIONS.md`**: The universal entry point and rulebook. This file dictates the strict workflow, directory naming conventions, and timing mechanisms that all agent harnesses must follow to produce valid benchmark results.
*   **`challengeNN-<slug>/`**: A generic representation of the challenge directories. The repository is modular, allowing new challenges to be added over time. Each directory isolates a specific problem to solve.
    *   **`README.md`**: Contains the precise specifications, evaluation criteria, and expected deliverables for the specific challenge. Agents rely on this to understand their goal.
    *   **Inputs**: Optional additional files specifically referenced by the challenge's `README.md` that provide starter code or necessary data.

*Note: In accordance with the challenge specification, solution result directories (`[harness]_[model]_[date]/`) and benchmark result summaries are deliberately omitted from this overview.*
