# Model interpretations

What we observed in each harness·model run: up to three strengths and three
weaknesses, grounded in the objective grades ([`SCORES.md`](../../SCORES.md)),
the timing markers, and the models' own write-ups (`bugs.md`, `analysis.md`,
`notes.md`). The headline ranking lives in the repo [`README.md`](../../README.md)
scoreboard; this page is the qualitative companion.

## How to read this

- **Two cohorts.** Challenges 04-07 did not exist when the earliest runs were
  made, so those runs only attempted the **core three** (01-03). They are judged
  on a 35-point scale; the **full gauntlet** runs are judged out of 100. Never
  compare a 35-scale score against a 100-scale score directly.
- **What each challenge probes.** 01 recursive utility types (`tsgo --strict`
  must compile); 02 creative p5.js (visual); 03 repo comprehension + PlantUML;
  04 subtle-bug detection (graded /9); 05 reverse-engineering an obfuscated
  function (behavioural equivalence); 06 type-level arithmetic; 07 a type-level
  lambda-calculus normaliser (frontier).
- **A measurement sharp edge.** The ch01 grader compiles the model's *own* test
  harness (`types.ts` + `tests.ts` + `examples.ts`) together, so a correct
  `DeepReadonly` can still fail the strict compile if the model over-asserts in
  its examples. Where that happened we say so.

---

## Full gauntlet (challenges 01-07)

### 🥇 codex · gpt-5.5 — 100/100, 7/7, avg 114s

**Pros**

- The only run to ace all seven: clean ch01 compile, a perfect 9/9 bug hunt,
  exact CRC-32 identification, and both type-level challenges (06 and the
  frontier 07) passing.
- Solved the frontier ch07 with a disciplined design — tokeniser, recursive
  descent, de Bruijn indices, normal-order reduction with a 100-step fuel bound
  returning `DIVERGE` — and self-verified with `tsgo` without reading the grader.
- The most reliable all-rounder: mid-pack, outlier-free pace (114s average,
  800s total) with no weak spot anywhere on the board.

**Cons**

- Not the quickest: gemini-3-flash reaches 80/100 in roughly half the time.
- Solutions and write-ups run long; thorough but verbose.

### 🥈 gemini · gemini-3.1-pro-preview — 100/100, 7/7, avg 141s

**Pros**

- Joint best score: every challenge passed, including the frontier ch07.
- The deepest reasoning footprint of the field. Its ch07 notes cite Pierce's
  *TaPL* for capture-avoiding substitution and justify a 400-step bound against
  TypeScript's instantiation-depth limit — understanding, not pattern-matching.
- Rock-solid on the graded reasoning tasks (9/9 bug hunt, CRC-32 nailed,
  type-eval pass).

**Cons**

- Slowest of the top tier (141s average, 990s total); ch06 and ch07 alone cost
  283s and 277s.
- Same final score as codex-5.5 for noticeably more latency.

### 🥉 gemini · gemini-3-flash-preview — 80/100, 7/7, avg 57s ⚡

**Pros**

- The speed champion: the only model to deliver all seven *and* average under a
  minute (57s, 396s total) — about 2x faster than the gold tier.
- Still genuinely strong: ch01 compiles, 9/9 bug hunt, CRC-32 nailed, and the
  type-level arithmetic (06) passes.
- Best quality-per-second on the board — the pragmatic default when throughput
  matters more than the last few points.

**Cons**

- Failed the frontier ch07: it chose a 50-step reduction bound (versus 100-400
  for the runs that passed), too small to normalise the harder terms — its own
  notes flag the risk.
- Trades depth for speed on the very hardest type-level work.

### 4. pi · gemma-4-26b-q6k — 53/100, 6/7 _(local)_

A 26B model at q6k, partially GPU-offloaded, running fully offline.

**Pros**

- Outstanding for a local model: a clean ch01 `DeepReadonly` compile, a
  near-perfect 8/9 bug hunt, and a correct CRC-32 analysis with exact parameters
  — the strongest local result on type soundness.
- Beats a frontier cloud model (gemini-2.5-pro) on score while running on a
  single consumer GPU.

**Cons**

- Incomplete: no ch03 deliverable, and the ch07 solution file is empty.
- Both type-level challenges (06, 07) fail — type-system computation is out of
  reach.
- Erratic timing (607s on the visual challenge) from partial-offload contention.

### 5. pi · deltacoder-9b-q8 — 50/100, 7/7 _(local)_

**Pros**

- A 9B local model that delivered *every* challenge — the broadest coverage of
  any local run.
- Perfect 9/9 bug hunt and correct CRC-32 reverse-engineering, with a clear,
  well-structured `bugs.md` that even caught the `mapLimit` global-index defect.
- Quick on the lighter tasks for its hardware.

**Cons**

- ch01 fails to compile — its example harness assigns a `ReadonlyMap` to a
  mutable `Map`; type soundness is shaky.
- Both type-level challenges (06, 07) fail.
- ch04 took 357s — slow on the deeper reasoning task.

### 6. gemini · gemini-2.5-pro — 50/100, 5/7

**Pros**

- Excellent reasoning on what it attempted: a 9/9 bug hunt whose write-up also
  *confirms* the correct functions (`clamp`, `dedupe`), plus a precise CRC-32
  analysis.
- Its `DeepReadonly` is essentially correct — the ch01 failure is only two
  *unused* `@ts-expect-error` directives, i.e. its types were stricter than its
  own test expected.
- Fast on delivered work (44s average).

**Cons**

- Skipped both type-level challenges (06, 07) entirely — no output.
- Scores 0 on ch01 despite sound types, because its over-asserting test harness
  fails the strict compile.
- Narrowest completion among the capable cloud models (5/7).

### 7. codex · gpt-5.4 — 40/100, 3/7

**Pros**

- Flawless on everything it reached: a clean ch01 compile and a perfect 9/9 bug
  hunt with crisp root-cause analysis.
- Shares the disciplined style of its successor, gpt-5.5.

**Cons**

- The run was cut short by a ChatGPT Codex usage-quota exhaustion, so only 3/7
  were attempted — the score badly under-represents the model.
- No signal on the harder challenges (05-07); not comparable to the full runs.

---

## Core three (challenges 01-03 only)

These runs predate challenges 04-07. All of the Opus/Claude/Qwen runs sweep the
core three perfectly, so **speed and effort settings** are the differentiator.

### pi · opus-4.6 — 35/35, 3/3, avg 44s

**Pros**

- A perfect, clean core sweep at the fastest average of any core run (44s, 133s
  total) — the efficiency benchmark.
- Compact, idiomatic deliverables.

**Cons**

- Only faced the core three, so there is no signal on the harder reasoning or
  type-level work.

### qwen · qwen3.5-coder — 35/35, 3/3, avg 122s

**Pros**

- Perfect core sweep with a clean `DeepReadonly` compile.
- Solid, steady mid-pack pace.

**Cons**

- Most verbose ch01 of the core cohort (151 lines) — more surface area than the
  task needs.
- Untested on 04-07.

### claude · opus-4.6 — 35/35, 3/3, avg 144s

The same model as `pi · opus-4.6`, but driven through the Claude Code harness.

**Pros**

- Perfect core sweep; compact, idiomatic 89-line `types.ts`.

**Cons**

- ch01 took 350s versus 58s for the identical model under pi — a striking
  harness-overhead gap on the same work.
- Untested on 04-07.

### pi · opus-4.7-high — 35/35, 3/3, avg 154s

**Pros**

- Perfect core sweep with a thorough, heavily-commented 198-line `types.ts`.

**Cons**

- Roughly 3.5x slower than opus-4.6 for the same 35/35 — the `high` effort
  setting buys no measurable gain on tasks this size.

### pi · opus-4.8-high — 35/35, 3/3, avg 177s

**Pros**

- Perfect core sweep; went beyond the brief on ch03 by rendering the PlantUML to
  a `repo-overview.png`.

**Cons**

- 177s average for a result opus-4.6 reached in 44s — diminishing returns from
  the newer/higher-effort configuration on easy tasks.

### pi · opus-4.8-xhigh — 35/35, 3/3, avg 277s

**Pros**

- Perfect core sweep and the most polished artefacts: it rendered both a PNG and
  an SVG of the repo overview, and a `preview.png` for the solar system.

**Cons**

- By far the slowest core run (277s average, 831s total) — about 6x opus-4.6 for
  an identical score. The `xhigh` effort is pure overkill here.

### pi · gemma-4-26b-q6k — 20/35, 2/3 _(local)_

The April core run of the same local model that later scored 53/100 in June.

**Pros**

- Delivered a working solar-system sketch and a themed PlantUML overview on
  local hardware.

**Cons**

- ch01 `DeepReadonly` fails to compile — type soundness was already shaky in
  April (the June run later fixed this).

### pi · deltacoder-9b-q8 — 15/35, 1/3 _(local)_

The April core run; by June this model broadened to all seven challenges.

**Pros**

- Produced a working solar-system sketch quickly (33s average) on local
  hardware.

**Cons**

- ch01 fails to compile, and the ch03 PlantUML is missing the required
  `!theme blueprint` (the June run added it).

### opencode · gemma-4-26b-q8_0 — 10/35, 1/3 _(local)_

**Pros**

- Delivered a valid, themed PlantUML overview for ch03.

**Cons**

- Only one of the three core challenges produced gradeable output here (no ch01
  or ch02 deliverables in this run).
- Its duration marker is a stored unix timestamp rather than an elapsed count, so
  the run's speed is unrecoverable — an instrumentation bug in this harness run.

---

## Cross-cutting observations

- **The frontier (ch07) separates the very top.** Only codex-5.5 and
  gemini-3.1-pro normalised the type-level lambda calculus. The decisive factor
  was the reduction step-bound: 50 steps fails (gemini-3-flash), 100-400 passes.
- **Reverse-engineering well-known algorithms is broadly solved.** Every model
  that attempted ch05 — including local 9B and 26B models — correctly identified
  reflected CRC-32 (`0xEDB88320`, init/final `0xFFFFFFFF`).
- **Reasoning-effort settings show diminishing returns on easy tasks.** The Opus
  `high`/`xhigh` runs cost 3.5-6x the time of opus-4.6 for the identical 35/35 on
  the core three. More thinking only pays off when the task is genuinely hard.
- **Local models punch above their weight.** Running fully offline on one
  consumer GPU, gemma-4-26b (53) and deltacoder-9b (50) match or beat a frontier
  cloud model's score on this suite — though both collapse on type-level
  computation (06, 07).
- **Harness overhead is real.** The same Opus-4.6 model took 350s on ch01 via
  Claude Code but 58s via pi — worth controlling for when comparing runs.
