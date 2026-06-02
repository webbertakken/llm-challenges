# Scores

Objective grading of every run (`scripts/grade-all.ts`). Read-only.

- ch01 deep-readonly: `tsgo --strict` compiles clean
- ch02 solar-system / ch03 plantuml: deliverables present (`ok`); ch03 checks `!theme blueprint`
- ch04 bug-hunt: behavioural grader score /9
- ch05 reverse-engineer: equivalence over 5k inputs
- ch06 type-eval / ch07 type-lambda: compile-time assertion graders

| Run | 01 | 02 | 03 | 04 | 05 | 06 | 07 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `claude_opus-4.6_2026-04-03` | ✅ compiles | ok | ok | — | — | — | — |
| `codex_gpt-5.4_2026-06-02` | ✅ compiles | ok | — | 9/9 | — | — | — |
| `codex_gpt-5.5_2026-06-02` | ✅ compiles | ok | ok | 9/9 | ✅ equiv | ✅ pass | ✅ pass |
| `gemini_gemini-2.5-pro_2026-06-02` | ❌ errors | ok | ok | 9/9 | ✅ equiv | — | — |
| `gemini_gemini-3-flash-preview_2026-06-02` | ✅ compiles | ok | ok | 9/9 | ✅ equiv | ✅ pass | ❌ fail |
| `gemini_gemini-3.1-pro-preview_2026-06-02` | ✅ compiles | ok | ok | 9/9 | ✅ equiv | ✅ pass | ✅ pass |
| `opencode_gemma-4-26b-q8_0_2026-04-03` | — | — | ok | — | — | — | — |
| `opencode_gemma-4-26b-q8_0_2026-04-03_altered` | — | — | — | — | — | — | — |
| `pi_claude-opus-4-6_2026-04-03` | — | — | ok | — | — | — | — |
| `pi_deltacoder-9b-q8_2026-04-03` | ❌ errors | ok | no-theme | — | — | — | — |
| `pi_deltacoder-9b_q8_2026-06-02` | ❌ errors | ok | ok | 9/9 | ✅ equiv | ❌ fail | ❌ fail |
| `pi_gemma-4-26b-a4b_2026-04-03` | — | ok | — | — | — | — | — |
| `pi_gemma-4-26b_q6k_2026-04-03` | ❌ errors | — | ok | — | — | — | — |
| `pi_gemma-4-26b_q6k_2026-06-02` | ✅ compiles | ok | — | 8/9 | ✅ equiv | ❌ fail | ❌ fail |
| `pi_opus-4.6_2026-04-03` | ✅ compiles | ok | — | — | — | — | — |
| `pi_opus-4.7-high_2026-06-02` | ✅ compiles | ok | ok | — | — | — | — |
| `pi_opus-4.8-high_2026-06-02` | ✅ compiles | ok | ok | — | — | — | — |
| `pi_opus-4.8-xhigh_2026-06-02` | ✅ compiles | ok | ok | — | — | — | — |
| `qwen_qwen3.5-coder_2026-04-03` | ✅ compiles | ok | ok | — | — | — | — |
