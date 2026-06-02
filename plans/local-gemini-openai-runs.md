# Plan: local + Gemini + OpenAI benchmark runs

Run all 7 challenges for each model. Folder: `challengeNN-<slug>/[harness]_[model]_[quant]_2026-06-02/`.

## Phase 0 — Setup (free VRAM, don't restart aggregator)

- [x] Smoke-test gemini CLI headless (`-p --yolo -m <model>`) and codex (`exec`)
- [x] Stop `webgpt-parakeet` (free VRAM)
- [x] Stop `webgpt-llama` (keep registered/stopped; aggregator won't revert it)
- [x] Build a `:8090` local llama launcher (own PM2 proc `llmchal-llama`)
- [x] Add temp pi `llama-cpp` model ids (backup at /tmp/llmchal/models.json.bak)

## Phase 1 — Local models (pi → llama-cpp :8090), all 7 challenges each

- [x] deltacoder-9b q8 (`DeltaCoder-9B-v1.1-DPO-Q8_0.gguf`) — 7/7 (full GPU, fast)
- [x] gemma-4-26b q6k (`gemma-4-26B-A4B-it-Q6_K.gguf`) — 7/7 partial (`-ngl 10` partial offload, coexisting with active ftd image-gen)
- [~] gemma-4-26b q8_0 — SKIPPED: 26GB model can't fit 24GB GPU alongside the active ftd image-gen pipeline; q6k represents gemma-4-26b

## Phase 2 — Restore assistant

- [x] Deleted `llmchal-llama`; restarted `webgpt-llama` (qwopus2b restored) + `webgpt-parakeet`; restored pi models.json
- [x] Verified :8090 serves qwopus2b; parakeet, aggregator, routine-scheduler, ftd-worker all online (aggregator never restarted by me)

## Phase 3 — Gemini (best → worst), all 7 challenges each

- [x] gemini-3.1-pro-preview — 7/7
- [x] gemini-3-flash-preview — 7/7
- [x] gemini-2.5-pro — 5/7 (ch06/07 type-level: no output)

## Phase 4 — OpenAI via codex (best → worst), all 7 challenges each

- [x] gpt-5.5 — 7/7
- [~] gpt-5.4 — 3/7 (ChatGPT Codex usage quota exhausted mid-run, resets Jun 7)
- [~] gpt-5.4-mini — 0/7 BLOCKED by codex usage quota (resets Jun 7); folders not created

## Phase 5 — Verify, scoreboard, ship

- [x] Grade every run -> SCORES.md (`scripts/grade-all.ts`)
- [x] Regenerate RESULTS.md scoreboard
- [x] Confirm existing tests/results untouched; CI green
- [x] Commit / PR / merge (PR #5)
