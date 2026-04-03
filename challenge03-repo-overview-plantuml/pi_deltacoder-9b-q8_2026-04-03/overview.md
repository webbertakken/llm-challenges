# LLM Challenges Repository Overview

This repository contains lightweight benchmark challenges for testing different LLM harness and model combinations.

## Repository Structure

```
llm-challenges/
├── INSTRUCTIONS.md
├── README.md
├── challenge01-deep-readonly/
│   └── [harness]_[model]_[quantisation]_[date]/
├── challenge02-solar-system/
│   └── [harness]_[model]_[quantisation]_[date]/
├── challenge03-repo-overview-plantuml/
│   └── [harness]_[model]_[quantisation]_[date]/
├── package.json
├── package-lock.json
├── img.png
├── .git/
├── .idea/
└── .qwen/
```

## Challenges

### Challenge 01: Deep Readonly
A TypeScript benchmark testing the model's ability to implement deep readonly patterns. Includes types, tests, and examples.

### Challenge 02: Solar System in p5.js
A creative coding challenge requiring a solar system simulation with orbiting planets, moons, and visual effects.

### Challenge 03: Repo Overview with PlantUML
A documentation challenge creating a PlantUML diagram that provides a clear overview of the repository structure.

## How to Use

1. **Identify Your Configuration**: Determine your harness, model, and quantisation level.
2. **Create Solution Folder**: Create a folder named `[challengeNN]/[harness]_[model]_[quantisation]_[YYYY-MM-DD]/`
3. **Write Solution**: Implement the challenge requirements directly in the solution folder.
4. **Verify**: Compile and test your solution.
5. **Record Timing**: Measure and record execution time.

## Model Configuration

- **Harness**: pi
- **Model**: deltacoder-9b-q8
- **Quantisation**: q8 (8-bit Q8_0)

---

*Generated using PlantUML with blueprint theme*
