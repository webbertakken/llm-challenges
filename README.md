# llm-challenges

Coding challenges for benchmarking LLM agents.

## How It Works

1. Pick a challenge (e.g. `challenge03`)
2. Open a terminal with your LLM coding agent in this repo
3. Tell it to solve the challenge — it will read `INSTRUCTIONS.md` and the challenge README

The LLM writes its solution into `challengeNN/[harness]--[model]--[YYYY-MM-DD]/`.

## Quick Start

```bash
# Install deps (needed for tsx / tsc)
npm install

# Regenerate challenge READMEs from generate.ts (optional)
npm run generate

# Verify a solution compiles
cd challenge01/pi--sonnet-4--2026-04-03
npx tsc --noEmit
```

## Results Structure

```
challenge01/
  pi--sonnet-4--2026-04-03/
    types.ts
    tests.ts
    examples.ts
challenge02/
  ...
```

The naming convention is `[harness]--[model]--[YYYY-MM-DD]` where:
- **harness** = the coding agent / CLI used (e.g. `claude`, "`pi`," `qwen`, "`aider`," `cursor`)
- **model** = the LLM model (e.g. `sonnet-4`, "`opus-4`," `deepseek-r1`, "`gpt-4o`)"
- **date** = the date of the run (YYYY-MM-DD)

## For LLMs

Read **[INSTRUCTIONS.md](./INSTRUCTIONS.md)** before solving any challenge.

Key steps: identify yourself → read the challenge README → write your solution → verify it compiles → record timing (`[seconds]s.txt`).