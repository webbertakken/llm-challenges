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
  compare a 35-scale score against a 100-scale score directly. The 2026-06-03
  `claude · opus-4.8` run was added later precisely to give Opus a full-gauntlet
  result (see *Coverage and availability*).
- **What each challenge probes.** 01 recursive utility types (`tsgo --strict`
  must compile); 02 creative p5.js (visual); 03 repo comprehension + PlantUML;
  04 subtle-bug detection (graded /9); 05 reverse-engineering an obfuscated
  function (behavioural equivalence); 06 type-level arithmetic; 07 a type-level
  lambda-calculus normaliser (frontier).
- **A measurement sharp edge.** The ch01 grader compiles the model's *own* test
  harness (`types.ts` + `tests.ts` + `examples.ts`) together, so a correct
  `DeepReadonly` can still fail the strict compile if the model over-asserts in
  its examples. Where that happened we say so.
- **Depth, not just pass/fail.** Every submission on every challenge was also
  read, probed and scored for depth, and each run's shortcomings are listed; see
  [*Qualitative quality - all challenges*](#qualitative-quality---all-challenges)
  and [*What each model did not do well*](#what-each-model-did-not-do-well).

---

## Full gauntlet (challenges 01-07)

### 🥇 codex · gpt-5.5 — 100/100, 7/7, avg 114s

**Pros**

- One of three runs to ace all seven: clean ch01 compile, a perfect 9/9 bug
  hunt, exact CRC-32 identification, and both type-level challenges (06 and the
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

### 🥉 claude · opus-4.8 — 100/100, 7/7, avg 391s

Added on 2026-06-03 to close the gap: the earlier `pi · opus-*` rows were made
before challenges 04-07 existed, so Opus had never faced the hard half. It has
now — and it is unambiguously top-tier.

**Pros**

- A flawless 100/100: clean ch01 compile, a 9/9 bug hunt that also *confirms*
  the correct functions, exact CRC-32 with a self-run 10k-input equivalence
  check, and **both** type-level challenges — including the frontier ch07 —
  passing.
- Cracked the frontier with a principled, fully type-level pipeline: a character
  tokeniser, a recursive-descent parser with a real grammar, de Bruijn
  conversion that handles shadowing, normal-order beta with index shifting, and a
  bounded fuel counter that yields `DIVERGE`.
- Went beyond the brief: rendered its PlantUML to PNGs (ch03) and shipped an
  elaborate animated sketch (ch02) — the most polished deliverables on the board.

**Cons**

- By far the slowest of the perfect club: 391s average, 2734s total — roughly
  3.4x codex-5.5 for the same score. Part is harness overhead (this run went via
  the Claude Code CLI with the full global config loaded) and part is Opus's own
  thoroughness (rendering diagrams, running its own 10k-input test).
- Quality matches the very best; throughput does not.

### 4. gemini · gemini-3-flash-preview — 80/100, 7/7, avg 57s ⚡

**Pros**

- The speed champion: the only model to deliver all seven *and* average under a
  minute (57s, 396s total) — about 2x faster than the gold tier.
- Still genuinely strong: ch01 compiles, 9/9 bug hunt, CRC-32 nailed, and the
  type-level arithmetic (06) passes.
- Best quality-per-second on the board — the pragmatic default when throughput
  matters more than the last few points.

**Cons**

- Failed the frontier ch07: it chose a 50-step reduction bound (versus the
  larger bounds the passing runs used), too small to normalise the harder terms
  — its own notes flag the risk.
- Trades depth for speed on the very hardest type-level work.
- _Correction (from reading the code):_ the shipped bound is 20 steps, not 50,
  and the real cause is a parser bug that fails even `\x.x`; see
  [*Corrections to earlier notes*](#corrections-to-earlier-notes).

### 5. pi · gemma-4-26b-q6k — 53/100, 6/7 _(local)_

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

### 6. pi · deltacoder-9b-q8 — 50/100, 7/7 _(local)_

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

### 7. gemini · gemini-2.5-pro — 50/100, 5/7

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

### 8. codex · gpt-5.4 — 40/100, 3/7

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
Opus's true ceiling is the perfect full-gauntlet `claude · opus-4.8` run above;
these older `pi · opus-*` and `claude · opus-4.6` rows only ever saw 01-03.

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

## Coverage and availability

Only the `claude` harness (real Opus 4.8) was runnable on 2026-06-03; every other
provider was rate-limited or needed interactive auth, so the remaining gaps could
not be filled today:

- **codex (gpt-5.4, gpt-5.5)** — OpenAI Codex usage quota exhausted until
  2026-06-07. gpt-5.5 was already complete; gpt-5.4 stays at 3/7.
- **gemini-2.5-pro** — the Gemini API returned `QUOTA_EXHAUSTED` for this model,
  so ch06/07 could not be added (gemini-3-flash and 3.1-pro were already 7/7).
- **qwen3.5-coder** — the qwen CLI requires interactive OAuth and cannot be
  driven headlessly here.
- **local models (deltacoder-9b, gemma-4-26b, opencode gemma)** — served by a
  local llama.cpp instance shared with another live system; not re-run to avoid
  disrupting it. The June deltacoder run is already 7/7; gemma is 6/7.
- **opus-4.6, opus-4.7** — retired versions that can no longer be requested;
  superseded for the hard half by the complete opus-4.8 run.

New runs use isolated workspaces (`scripts/bench/run-challenge.sh`): the agent
sees only the challenge README, its declared inputs, and a `node_modules`
symlink — never a grader or another model's solution.

---

## Cross-cutting observations

- **Opus was never weak — it was never tested.** Its earlier low placement was a
  pure coverage artifact: run on the hard half, `claude · opus-4.8` scored a
  perfect 100/100 and joined the very top of the board.
- **The frontier (ch07) separates the very top.** Three runs normalised the
  type-level lambda calculus — codex-5.5, gemini-3.1-pro, and opus-4.8 — each
  with a tokeniser, de Bruijn conversion, normal-order reduction, and a bounded
  fuel counter. For the rest the step bound was decisive: 50 steps fails
  (gemini-3-flash), larger bounds pass.
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

---

## Qualitative quality - all challenges

A pass/fail grade and a stopwatch say nothing about how *good* an answer is. This
section judges depth and quality by reading every run's work on all seven
challenges, not just the objective anchors in [`SCORES.md`](../../SCORES.md).
The scores are the hand-written second table in the repo
[`README.md`](../../README.md#qualitative-quality---all-challenges), ranked by
the [overall quality score](#overall-quality-score); each run's shortcomings are
listed in [*What each model did not do well*](#what-each-model-did-not-do-well).

### How this was judged

- **Read, not skimmed.** Every deliverable of every run was read: `types.ts` and
  `examples.ts` (01), `sketch.js` (02), `overview.puml` and `overview.md` (03),
  `bugs.md` and `fixed.ts` (04), `analysis.md`, `solution.ts` and the
  equivalence harness (05), `solution.ts` (06) and `solution.ts` and `notes.md`
  (07); `tests.ts` was read where it explained a failure.
- **ch01 behavioural probe.** Each run's `types.ts` was compiled on its own
  against 23 exact-type assertions: primitives, `null`/`undefined`, functions at
  the top and as properties, arrays, readonly arrays, tuples, `Map`, `Set`,
  `Date`, unions, optional properties, the README's own example, a
  `DeepMutable<DeepReadonly<T>>` round trip, `ReadonlyMap` and tuple thawing,
  `DeepPartial` on arrays and tuples, `DeepRequired`, `DeepPick` (the README
  example and a path through an optional property) and a self-referencing
  interface. This isolates the types from each run's own test harness, which is
  what the objective grader compiles.
- **ch02 rendered.** Every `index.html` was loaded in headless Chromium at
  1280x800 (dark scheme), screenshotted after 3 s and again 1.5 s later; the
  pixel difference proves motion, and page errors were captured. The code was
  then read for planet count, moons, rings, belt, camera controls and orbital
  model (hand-tuned speeds versus real periods or Kepler's equation).
- **ch03 rendered and fact-checked.** Every `overview.puml` was rendered with
  PlantUML 1.2025.4; three do not render at all. Every box and arrow was checked
  against the repository the run actually saw (the April and early-June runs
  predate challenges 04-07; the isolated runs got a snapshot without graders or
  results), and against the brief's two rules: no result folders, no individual
  challenges.
- **ch04 exhaustive probes.** Every `fixed.ts` was run over all 10,000,000
  in-contract `roundCurrency` inputs (0 to 9999.999 in steps of 0.001) against
  exact decimal half-up rounding, plus a `groupBy` probe with a `"__proto__"`
  key and a `mapLimit` probe that records peak concurrency. The grader's 9/9
  hides that two runs round wrongly on 65,613 inputs.
- **ch05 fuzzed.** Every `solution.ts` was compared with `mystery.mjs` on 3,000
  random UTF-16 strings, lone surrogates, a NUL, an emoji and a 100 kB string
  (all equivalent), and every run's own `equivalence.test.ts` was executed from
  its result folder.
- **ch06 stress.** 18 extra expressions per `Eval`: a 30-term sum, eleven nested
  parentheses, leading zeros (`007+3`, legal under `number = digit+`), a
  three-digit operand (`0*999+1`), `2*2*2*2*2*2*2*2`, right-nested subtraction
  and whitespace, with the compile time recorded.
- **ch07 hidden and heavy cases.** 16 unpublished closed terms (shadowing,
  capture, reduction under a binder, S K K, `2*2`, `3+2`, `pred 2`, `2^3`,
  whitespace, redundant brackets, left-associative spines, unusual letters, a
  doubly discarded Ω, `Y I`, and the growing divergent `(\x.x x x)(\x.x x x)`)
  plus 6 heavy ones (`pred 5`, `2^4`, `3^3`, `2^5`, `fact 2` and `fact 3` via the
  Y combinator, the last needing 647 normal-order steps). Every expected output
  was generated by the challenge's own `grader/reference.ts`, so none of this is
  guesswork. The headline claims of the four strongest runs (`fact 4`, 3,873
  steps) were also re-run.
- **What counts.** 01: correct recursion across every container, no `any` or
  casts papering over bugs, examples that look like real code (a Redux reducer,
  a config loader, an API projection). 02: a real animated simulation with
  relative scale and extras, not static or broken. 03: an overview accurate to
  this repo, with correct relationships, that renders and follows the brief.
  04: the grade *and* whether the reasoning is right or lucky. 05: equivalence
  *and* how well `analysis.md` understands the code. 06: a general evaluator
  that survives inputs beyond the grader's. 07: a genuine general normaliser,
  the honesty of its bound, and robustness at TypeScript's TS2589 limit.

### Overall quality score

Each run gets one **Quality /10** that spans the whole gauntlet, and the README
table is ranked by it, the way the scoreboard ranks by score. It is a synthesis
of hand-given depth scores, not an average of objective passes:

1. **Depth per challenge**, 0-10, for each of 01-07. Anchors: 01 and 07 as in
   the per-model notes below; 02 from 0 (blank or broken) through 4 (meets the
   brief, no extras) to 10 (real orbital model, moons, rings, belt, camera,
   information panel); 03 from 0 (missing) through 4 (thin, unrenderable or
   naming each challenge) to 9 (accurate wiring end to end); 04 from 2 (8/9, no
   write-up) through 6 (9/9 by luck) to 10 (9/9, exhaustively correct, both
   defects in `median` and the pool shape of `mapLimit` explained); 05 from 3
   (the analysis is not Markdown) through 6 (correct but thin) to 10 (full
   parameter set, check value, surrogates and a large harness that runs); 06
   from 1 (does not compile) through 5-6 (TS2589 on modest inputs) and 8 (fails
   only leading zeros, or slow) to 10 (all 18 stress cases in under 0.5 s).
2. **Base** = the mean of the seven. A challenge that was not submitted counts as
   0, so a run that only faced 01-03 can reach at most about 4 and ranks low for
   coverage, not because its work was poor.
3. **Move by at most half a point** for evidence that spans challenges: +0.5 for
   self-verification the re-runs confirmed (measured limits, differential or
   100k-input equivalence testing); -0.5 for repeated overclaiming, shipped
   known-broken code, a rule breach or missing deliverables.
4. **Round down** to the half point and clamp to 0-10. Ties are broken by the
   unrounded score, then by the scoreboard's average time (faster first).

| # | Run | 01 | 02 | 03 | 04 | 05 | 06 | 07 | Base | Adjustment | Quality |
| ---: | --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | --- | :---: |
| 1 | pi · opus-5.5-xhigh | 10 | 10 | 5 | 10 | 10 | 10 | 10 | 9.29 | +0.5 `fact 4` and 101k-input harness confirmed | **9.5** |
| 2 | pi · fable-5.1-xhigh | 9 | 9 | 7 | 10 | 10 | 9 | 9 | 9.00 | +0.5 measured `fact 4`, zlib cross-check | **9.5** |
| 3 | pi · opus-5.5-medium | 8 | 8 | 9 | 10 | 9 | 9 | 9 | 8.86 | +0.5 measured `fact 4`, 20k-input harness | **9** |
| 4 | pi · opus-5.5-high | 9 | 9 | 6 | 10 | 9 | 10 | 9 | 8.86 | +0.5 differential tests, 88k-check harness | **9** |
| 5 | pi · opus-5-xhigh | 8 | 9 | 6 | 10 | 10 | 9 | 8 | 8.57 | +0.5 predicted TS2589 limits confirmed | **9** |
| 6 | pi · opus-5-high | 7 | 9 | 6 | 10 | 9 | 9 | 8 | 8.29 | +0.5 measured depth ceiling and step table | **8.5** |
| 7 | claude · opus-4.8 | 7 | 9 | 9 | 10 | 8 | 8 | 8 | 8.43 | none | **8** |
| 8 | pi · deepseek-v4-flash-high | 7 | 8 | 9 | 9 | 9 | 8 | 6 | 8.00 | none | **8** |
| 9 | grok · grok-4.7-high | 4 | 9 | 8 | 9 | 8 | 10 | 5 | 7.57 | none | **7.5** |
| 10 | grok · grok-4.7-xhigh | 7 | 8 | 9 | 9 | 8 | 6 | 6 | 7.57 | none | **7.5** |
| 11 | antigravity · gemini-3.8-flash-high | 7 | 8 | 5 | 9 | 7 | 8 | 7 | 7.29 | none | **7** |
| 12 | codex · gpt-5.5 | 6 | 7 | 7 | 8 | 8 | 8 | 7 | 7.29 | none | **7** |
| 13 | grok · grok-4.6-xhigh | 5 | 7 | 7 | 9 | 7 | 9 | 6 | 7.14 | none | **7** |
| 14 | antigravity · gemini-3.1-pro-high | 6 | 6 | 4 | 8 | 6 | 7 | 6 | 6.14 | none | **6** |
| 15 | antigravity · gemini-3.7-flash-high | 5 | 8 | 3 | 8 | 7 | 9 | 6 | 6.57 | -0.5 notes (120 vs 100), invented `tsconfig.json` | **6** |
| 16 | pi · deepseek-v4-pro-high | 5 | 6 | 5 | 9 | 8 | 5 | 4 | 6.00 | none | **6** |
| 17 | grok · grok-4.6-high | 5 | 7 | 5 | 7 | 7 | 8 | 6 | 6.43 | -0.5 "128 steps" per subterm, invented script chain | **5.5** |
| 18 | gemini · gemini-3.1-pro-preview | 5 | 6 | 5 | 6 | 6 | 8 | 8 | 6.29 | -0.5 "no known limitations", lucky 9/9 | **5.5** |
| 19 | gemini · gemini-3-flash-preview | 4 | 4 | 6 | 8 | 6 | 7 | 2 | 5.29 | -0.5 notes claim 50 steps and an unrun self-check | **4.5** |
| 20 | pi · opus-4.8-xhigh | 6 | 8 | 8 | - | - | - | - | 3.14 | none; core three only | **3** |
| 21 | codex · gpt-5.4 | 6 | 6 | - | 9 | - | - | - | 3.00 | none; quota stopped the run | **3** |
| 22 | pi · opus-4.6 | 7 | 7 | 6 | - | - | - | - | 2.86 | none; core three only | **2.5** |
| 23 | pi · opus-4.8-high | 7 | 7 | 6 | - | - | - | - | 2.86 | none; core three only | **2.5** |
| 24 | gemini · gemini-2.5-pro | 4 | 4 | 4 | 6 | 5 | - | - | 3.29 | -0.5 ch05 harness runs the forbidden grader | **2.5** |
| 25 | pi · opus-4.7-high | 7 | 7 | 5 | - | - | - | - | 2.71 | none; core three only | **2.5** |
| 26 | pi · deltacoder-9b-q8 (Jun) | 2 | 3 | 2 | 7 | 6 | 1 | 1 | 3.14 | -0.5 notes claim cases the code cannot produce | **2.5** |
| 27 | claude · opus-4.6 | 6 | 6 | 4 | - | - | - | - | 2.29 | none; core three only | **2** |
| 28 | qwen · qwen3.5-coder | 6 | 0 | 3 | - | - | - | - | 1.29 | none; core three only | **1** |
| 29 | pi · gemma-4-26b-q6k (Apr) | 2 | 4 | 2 | - | - | - | - | 1.14 | none; core three only | **1** |
| 30 | pi · gemma-4-26b-q6k (Jun) | 1 | 3 | - | 2 | 3 | 1 | 0 | 1.43 | -0.5 no ch03, no `bugs.md`, empty ch07 | **0.5** |
| 31 | pi · deltacoder-9b-q8 (Apr) | 1 | 2 | 1 | - | - | - | - | 0.57 | none; core three only | **0.5** |
| 32 | opencode · gemma-4-26b-q8_0 | - | - | 2 | - | - | - | - | 0.29 | none | **0** |

The April core runs are credited with the sibling folders the scoreboard merges
into them: `pi_claude-opus-4-6` (ch03) for pi · opus-4.6 and
`pi_gemma-4-26b-a4b` (ch02) for the April gemma run.

What the ranking says:

- **Breadth moved the order.** Scored across seven challenges, opus-5.5-xhigh
  and fable tie on 9.5. opus-5.5-medium draws level with opus-5.5-high (its
  accurate ch03 offsets high's deeper ch01 and ch06; high hides the tooling in
  one box) and ranks ahead on speed. Nobody is flawless: even the
  leader drew a repo overview that leaves out `scripts/` and CI.
- **ch03 is the great leveller.** It is the challenge with the weakest top-end:
  only grok-4.7-xhigh, deepseek-v4-flash, opus-5.5-medium and claude opus-4.8
  get the tooling wiring right. Most detailed diagrams from strong models invent
  at least one relationship (`verify-challenges.ts` "type-checks submissions";
  it runs each grader against its reference).
- **Objective passes hid luck and breakage.** gemini-3.1-pro and gemini-2.5-pro
  score 9/9 on ch04 with a `roundCurrency` that is wrong on 65,613 in-contract
  inputs; qwen's ch02 counts as delivered but renders a blank canvas; codex-5.5,
  grok-4.6-high and deltacoder still lose a `"__proto__"` group in `groupBy`.
- **Grok 4.7 recovers.** Its ch01 and ch07 held it back, but grok-4.7-high has
  the fastest perfect ch06 and a rich ch02, and grok-4.7-xhigh the most
  accurate ch03, so both climb to 7.5.
- **The antigravity flash runs are fast and uneven.** Excellent ch02 and ch06,
  weak ch03 (one does not render, the other draws the forbidden result folder).
- **Core-three runs rank 20th and below by construction.** opus-4.8-xhigh has
  one of the best ch03s on the board and a polished ch02, but four of seven
  challenges did not exist when it ran.

### What each model did not do well

At most three shortcomings per run, across all exercises combined; strong runs
get their honest nitpicks. Ordered as in the quality table.

**pi · opus-5.5-xhigh**

- ch03 leaves out `scripts/` and CI entirely and draws a top-level `results/` folder that does not exist.
- The slowest full-gauntlet run (422 s average); ch02 alone took 1,052 s for a 1,405-line sketch.
- Verbose where it need not be: a 141-line analysis of textbook CRC-32 and a 160-line `bugs.md`.

**pi · fable-5.1-xhigh**

- ch03 says `verify-challenges.ts` compiles every submission; it runs each grader against its reference.
- ch03 also has `scoreboard.ts` writing `SCORES.md`; `grade-all.ts` writes it, `scoreboard.ts` writes `RESULTS.md`.
- ch07 returns the right `fact 4` but with a TS2589 alongside, and ch01's `DeepKeyOf` stops at depth 10.

**pi · opus-5.5-medium**

- ch01 examples are the shortest of the top tier: one reducer, typed defaults and a PATCH type.
- ch07 ends in TS2589 on the growing divergent term, and `fact 4` comes with a TS2589 too.

**pi · opus-5.5-high**

- ch03 collapses `scripts/` into one "repo automation" box and omits CI, so the tooling pipeline is invisible.
- ch07 hits TS2589 on `fact 4` and on the growing divergent term (15 of 16 hidden cases).
- Costly: ch07 alone took 1,035 s, and the run averages 256 s per challenge.

**pi · opus-5-xhigh**

- ch03 swaps the scripts' outputs: `scoreboard.ts` "aggregates into" `SCORES.md`, `leaderboard.ts` "ranks into" `RESULTS.md`.
- ch07 dies with TS2589 on `fact` and the growing divergent term, far below its 600-step bound.
- ch04 `bugs.md` runs to 273 lines for seven defects.

**pi · opus-5-high**

- ch03 claims `verify` type-checks and runs every submission and `scoreboard.ts` runs the graders; neither is true.
- ch01 "reducer" is a one-argument `toggleSidebar`, and `Date` is walked as an object.
- ch07 is depth-bound: `fact` and the growing divergent term end in TS2589.

**claude · opus-4.8**

- ch06 evaluates `007+3` to 3: leading zeros, legal under `number = digit+`, are mis-parsed.
- ch05 `equivalence.test.ts` imports `./mystery.mjs`, so it crashes when run from its result folder.
- ch01 has no action type and walks `Date`; 391 s average, 3.4x codex-5.5 for similar work.

**pi · deepseek-v4-flash-high**

- ch07 dies with TS2589 on `fact` and the growing divergent term despite its 400-step bound.
- ch06 fails `007+3` (leading zeros).
- ch01 examples have no action type, and `Date` is walked as an object.

**grok · grok-4.7-high**

- ch01 tests `WeakSet` before `Set`, so `DeepReadonly<Set<T>>` becomes `WeakSet<T>`; its own test caught it, and it shipped.
- ch07 has a 58-step bound and 0-64 index tables: `2^5` returns `DIVERGE`, `fact` hits TS2589.
- ch02 took 1,145 s for a 1,237-line sketch.

**grok · grok-4.7-xhigh**

- ch06 hits TS2589 on `0*999+1`, whose result is 1.
- ch07 pairs a 48-step bound with a successor table capped at 40: `2^5` and `fact` return `DIVERGE`.
- ch01 fails the strict compile on two over-ambitious assertions in its own tests; ch02 took 1,210 s.

**antigravity · gemini-3.8-flash-high**

- ch01 `cloneToMutable` round-trips through JSON, silently turning `Map`s into `{}`.
- ch03 draws the `[harness]_[model]_...` result folder the brief forbids and leaves out `scripts/` and CI.
- ch06 fails `007+3`, and ch07 silently drops unknown characters instead of rejecting them.

**codex · gpt-5.5**

- ch04 `groupBy` uses `Object.hasOwn` on `{}`, so a `"__proto__"` key sets the prototype and its group vanishes.
- ch01 examples are toys: one selector, a fixed two-element `history` tuple, a note exported as a string.
- ch07 ends in TS2589 on `fact` and the growing divergent term; ch06 needs about 6 s for 18 expressions.

**grok · grok-4.6-xhigh**

- ch01 cart example mixes readonly and mutable items and fails the strict compile.
- ch07's 64-step gas sits just above the published cases, and `fact` hits TS2589.
- ch05 analysis never considers lone surrogates, the one input where a hand-rolled UTF-8 encoder would differ.

**antigravity · gemini-3.1-pro-high**

- ch03 diagram is two boxes (`INSTRUCTIONS.md` and a challenge folder): no README, `package.json`, `scripts/` or CI.
- ch07's 30-step bound is the tightest on the board: `2^4` already returns `DIVERGE`.
- ch01 examples are thin (a state constant, an identity `updateConfig`), and ch06 fails `007+3`.

**antigravity · gemini-3.7-flash-high**

- ch03 PlantUML does not render (free text inside `file {}`) and invents a `tsconfig.json`.
- ch01 tuples gain a phantom `...never[]` rest, so `length` becomes `number` and the round trip breaks.
- ch07 notes claim a 120-step bound; the code runs 100.

**pi · deepseek-v4-pro-high**

- ch06 and ch07 are shallow: TS2589 on a 30-term sum, on `0*999+1` and already on `pred 3`.
- ch03 invents wiring: CI runs `grade-all`, `verify` type-checks solutions, `grade-all` drives the bench runner.
- ch01 examples are mostly `declare` stubs with no bodies.

**grok · grok-4.6-high**

- ch01 reducer and `produce` examples do not compile (readonly users into a mutable `Map`).
- ch04 `groupBy` still loses a `"__proto__"` group, and ch07's "128 steps" is really 128 per subterm.
- ch03 draws a `verify` → `scoreboard` → `leaderboard` chain that does not exist.

**gemini · gemini-3.1-pro-preview**

- ch04 `roundCurrency` adds `Number.EPSILON` and is wrong on 65,613 in-contract inputs (`2.135` → 2.13).
- ch01 `DeepPartial` makes array elements optional, and the examples are toys.
- ch03 says the scripts "evaluate the agents' solutions" and omits `grader/`; `verify` checks graders against references.

**gemini · gemini-3-flash-preview**

- ch07 parser recurses forever on `never`, so every input, even `\x.x`, ends in TS2589; notes claim 50 steps, code runs 20.
- ch02 is minimal: no zoom or pan, no asteroid belt, and every planet starts on one straight line.
- ch01 `{ ...current, ...patch } as AppConfig` hides a shallow-merge bug behind a cast.

**pi · opus-4.8-xhigh**

- Faced only challenges 01-03, and at 277 s average it is the slowest core run by far.
- ch01 `reducer(state)` takes no action, and the draft example needs a `structuredClone(...) as` cast.
- ch02 planets are pin-pricks next to their labels, hard to tell apart without reading.

**codex · gpt-5.4**

- A usage quota stopped the run at 3/7: no ch03, ch05, ch06 or ch07.
- ch01 `DeepPick` returns `ReadonlyMap` where the spec's own example wants `Map`; the examples are a state constant.
- ch02 buries the four inner planets and their overlapping labels inside the Sun's glow.

**pi · opus-4.6**

- Faced only challenges 01-03.
- ch01 PATCH example's `updateUser` calls itself unconditionally, and `DeepPartial` turns tuples into arrays.
- ch03 draws the per-run result folders the brief says to leave out, and its markdown names individual challenges.

**pi · opus-4.8-high**

- Faced only challenges 01-03.
- ch03 draws the per-run result folder the brief says to leave out.
- ch01 has no action type; 177 s average for work opus-4.6 did in 44 s.

**gemini · gemini-2.5-pro**

- ch01 fails the strict compile, tuples collapse to arrays, and the example runs the forbidden `push`.
- ch04 `roundCurrency` uses the same `Number.EPSILON` fudge (65,613 misses); ch06 and ch07 were never submitted.
- ch05 `equivalence.test.ts` shells out to `../grader/grade.ts`, which the brief forbids.

**pi · opus-4.7-high**

- Faced only challenges 01-03.
- ch03 names challenges 01-03 on its edges, draws result folders, and embeds an `overview.svg` that does not exist.
- ch01 `AnyFunction` is typed with `any`.

**pi · deltacoder-9b-q8 (Jun)**

- ch01 examples, ch06 and ch07 all fail to compile (ch06 subtracts values inside a type).
- ch02 Saturn's "ring" is a filled polygon spanning its whole orbit, and zoom can only ever increase.
- ch03 lists every challenge by name and invents files (`app.ts`, `assets/`, `tsconfig.json`).

**claude · opus-4.6**

- Faced only challenges 01-03.
- ch03 PlantUML does not render (free text inside `file {}`), and it draws result folders.
- ch01 needs `as` casts to compile its Redux example; ch02 planets start in a line and Neptune off-screen.

**qwen · qwen3.5-coder**

- Faced only challenges 01-03.
- ch02 renders a blank canvas: top-level `random(TWO_PI)` runs before p5 loads and throws.
- ch03 names the three challenges and draws a solutions package; ch01 casts hide a shallow merge.

**pi · gemma-4-26b-q6k (Apr)**

- Faced only challenges 01-03; ch01 fails to compile, functions become `{}`, `DeepMutable` keeps `readonly`.
- ch02 (filed as `gemma-4-26b-a4b`) is minimal: no controls or belt, and a flat, untilted Saturn ring.
- ch03 names each challenge and includes `ALL_PROMPTS.md`, a local prompt log rather than part of the repo.

**pi · gemma-4-26b-q6k (Jun)**

- No ch03 and no `bugs.md`; ch04 `mapLimit` never drops settled promises (5 in flight at limit 2).
- ch06 has a syntax error and returns a string; ch07 `solution.ts` is empty; ch01 ships a `{}` placeholder.
- ch02 draws each orbit ring around its planet instead of the Sun; ch05 `analysis.md` is a JS comment that doubts itself.

**pi · deltacoder-9b-q8 (Apr)**

- Faced only challenges 01-03; ch01 `DeepMutable` is a no-op and the examples fail to compile.
- ch02: Jupiter to Neptune orbit outside a 1280x800 view, moons are zero-size and circle the Sun, planets barely move.
- ch03 PlantUML does not render, uses `skinparam theme` instead of `!theme`, and names each challenge.

**opencode · gemma-4-26b-q8_0**

- Only ch03 was delivered: no ch01 and no ch02.
- ch03 is a file tree without a single relationship, naming the three challenges beside the generic one.
- ch03 embeds `overview.puml` as an image, which Markdown cannot display; its duration marker is a timestamp.

### Challenges 02-06 - what the reading found

**02 solar system.** Every sketch loads without errors and moves, except qwen's
(blank: `random()` at module scope throws before p5 exists). The weakest working
ones are deltacoder April (four planets permanently off-screen, invisible moons,
near-static orbits), deltacoder June (Saturn's ring drawn as a disc over its
whole orbit) and gemma June (orbit rings centred on the planets). gemini-2.5-pro,
gemini-3-flash and gemma April meet the brief with nothing extra. The best are
real models: opus-5.5-xhigh computes positions from J2000 orbital elements with
Kepler's equation and adds an information panel, Pluto and comets; fable,
opus-5-high, opus-5-xhigh, opus-5.5-high, claude opus-4.8 and grok-4.7-high all
use real or Kepler-derived periods with belts, rings and camera controls.

**03 repo overview.** Three diagrams do not render (antigravity
gemini-3.7-flash, claude opus-4.6 and deltacoder April, all with free text or
bare labels inside a container). Six ignore the ban on naming individual
challenges (the three April gemma/deltacoder/opencode runs, qwen, opus-4.7-high
and deltacoder June); several draw the banned result folder (claude opus-4.6,
pi opus-4.6, opus-4.7-high, opus-4.8-high, antigravity gemini-3.8-flash, qwen and
deltacoder June).
Accurate wiring of the tooling (bench runner hides graders, `verify` checks each
grader against its reference, `grade-all` writes `SCORES.md`, `scoreboard`
writes `RESULTS.md`, `leaderboard` rewrites the README block, CI runs the
checks) appears only in grok-4.7-xhigh, deepseek-v4-flash, opus-5.5-medium and
claude opus-4.8.

**04 bug hunt.** Of the 23 runs, 22 score 9/9, but the probes separate them.
gemini-3.1-pro and gemini-2.5-pro fix `roundCurrency` with `Number.EPSILON`,
which is wrong on 65,613 of the 10,000,000 in-contract inputs (from `2.135` up)
and passes only because the grader never tries them. codex-5.5, grok-4.6-high and
deltacoder June guard `groupBy` with `hasOwn` on a plain `{}`, so a
`"__proto__"` key still swallows its group. gemma June scores 8/9 with no
`bugs.md` at all; its `mapLimit` runs five calls at limit 2. The fullest
write-ups (fable, claude opus-4.8, the opus-5 and opus-5.5 runs) explain both
defects in `median`, the batch-versus-pool shape of `mapLimit` and why
`clamp` and `dedupe` hold; the opus-5 and opus-5.5 runs also cover `NaN` and `-0`.

**05 reverse engineer.** All 22 solutions are equivalent under the extra fuzz,
lone surrogates included, and all name reflected CRC-32 with the right
parameters, so depth lives in `analysis.md` and the harness. gemma June's
analysis is a JavaScript block comment that argues with itself about the empty
input; gemini-2.5-pro's harness shells out to the forbidden grader; claude
opus-4.8's harness imports `./mystery.mjs` and cannot run from its folder. The
deepest pair the analysis with large harnesses: opus-5.5-xhigh (101,442 inputs),
opus-5.5-high (87,953), opus-5.5-medium (20,070) and fable (cross-checked
against `node:zlib`).

**06 type eval.** deltacoder and gemma June do not compile (deltacoder writes
value-level `R - 1` in a type; gemma leaves a conditional unclosed and returns a
string). Of the passing runs, six mis-read leading zeros (`007+3`): antigravity
gemini-3.1-pro and 3.8-flash, claude opus-4.8, gemini-3-flash, grok-4.6-high
and deepseek-v4-flash. deepseek-v4-pro hits TS2589 on a 30-term sum and on
`0*999+1`, grok-4.7-xhigh on `0*999+1`. antigravity gemini-3.1-pro, codex-5.5
and gemini-3-flash need about 6 s for the 18 expressions; grok-4.7-high,
opus-5.5-high and opus-5.5-xhigh clear all of them in under half a second.

### Challenge 01 - per model

**antigravity · gemini-3.1-pro-high (6/10).** The most compact correct suite on
the board: one `Builtin` union, `Map`/`Set`/`Promise` branches, and it lets the
homomorphic mapped type carry arrays and tuples instead of special-casing them.
It clears 22 of 23 probes (only a `DeepPick` through an optional segment fails).
The examples are thin: the "Redux" example is a state type plus one initial
value, `updateConfig` just returns its argument, and nothing resembles a reducer.

**antigravity · gemini-3.7-flash-high (5/10).** Explicit variadic tuple
recursion that ends in `DeepReadonly<[]>`, so every tuple gains a phantom rest
element: `DeepReadonly<[string, {a: number}]>` is
`readonly [string, {...}, ...never[]]`, whose `length` is `number`. The
`DeepMutable` round trip breaks for the same reason. It also makes `Map` keys
readonly. The examples are plausible domain models, but `createInitialState`
casts a value that needed no cast.

**antigravity · gemini-3.8-flash-high (7/10).** A clean 23 of 23, including
the one `DeepPick` detail almost everyone missed (an optional segment stays
optional). The examples are good: a real config-override merge and a
`PublicCustomerSummary` projection that drops the SSN and card token. It loses
points for a state-only "Redux" example and a `cloneToMutable` that round-trips
through JSON, which would silently turn `Map`s into `{}` at runtime.

**claude · opus-4.6 (6/10).** Sound core with explicit tuple handling, but
`DeepPartial`/`DeepRequired` keep `Set<U>` without recursing and `Date` is
walked as an object (20 of 23). The Redux example has a selector and a
spread-based `updateTheme`, but it needs `as AppState["posts"]` to type-check,
and the thaw example uses `as unknown as`.

**claude · opus-4.8 (7/10).** `any`-free by design (`AnyFunction` uses
`never[]` parameters), well documented, and 21 of 23 (`Date` is walked; the
optional-path pick fails). The examples run and compile: selectors, an
Immer-like "mutable draft to immutable snapshot" step, a layered config and a
list-view projection. There is no action type or reducer signature, though.

**codex · gpt-5.4 (6/10).** Careful types (it even keeps optional keys optional
inside `DeepPick`), but its `DeepPick` post-processing matches `Map` against
`ReadonlyMap` first, so the README's own example comes back with
`e: ReadonlyMap<...>` where the spec asks for `Map`. The examples are a state
snapshot constant, a labelled-tuple config and a pick. No reducer.

**codex · gpt-5.5 (6/10).** Terse, correct and `any`-free with an explicit
`IsTuple` split (22 of 23). `DeepPick` degrades an optional segment to
`{ u: unknown }`, and `DeepPartial` quietly turns a `ReadonlyMap` into a mutable
`Map`. The examples are minimal: one selector, a fixed two-element `history`
tuple that no real store would have, and the circular-reference note exported
as a string constant.

**gemini · gemini-2.5-pro (4/10).** Tuples collapse to arrays
(`[string, X]` becomes `readonly (string | X)[]`), which the README lists as an
edge case, and the mutable round trip fails with them. Ironically it is one of
the few runs with a genuine reducer, `postReducer(state, action: { type:
'ADD_POST'; payload })` with a `switch`, but that example executes the
"forbidden" `push` at runtime under `@ts-expect-error`, and two directives on
commented-out lines make the file fail the strict compile.

**gemini · gemini-3.1-pro-preview (5/10).** Compact and handles `Promise`, but
`DeepPartial` maps arrays through the optional mapped type, so
`DeepPartial<{a: number}[]>` is `({ a?: number } | undefined)[]`: the exact
"optional-element" shape the README says to avoid. The examples are short and
generic (a state constant, a PATCH payload, a config pick).

**gemini · gemini-3-flash-preview (4/10).** Same array problem in `DeepPartial`,
`Date` walked as an object, `DeepPartial` turns `ReadonlyMap` into `Map`, and
`any` in every function guard. The config example's
`{ ...current, ...patch } as AppConfig` is a shallow merge whose bug is hidden
by the cast. The "Redux-like" example is a state constant with two
`@ts-expect-error` writes.

**grok · grok-4.6-high (5/10).** Strong types (22 of 23, with `WeakMap`,
`WeakSet` and `Promise` in the right order) and the most ambitious examples of
the early runs: a selector, a `reducer`, an Immer-style
`produce(state, recipe)` and `Record`-keyed config overlays. But those examples
do not compile: `new Map(state.users)` is a map of readonly users and cannot be
assigned where a mutable `Map<string, User>` or the `DraftState` is expected.
That is why the run fails ch01 objectively; the types are fine, and the
realistic code around them was never type-checked.

**grok · grok-4.6-xhigh (5/10).** Leaner types than 4.6-high, same verdict
(22 of 23). The cart example (`addItem(state, item)` building a `DeepMutable`
draft) is realistic, but `[...state.cart.items, item]` mixes readonly and
mutable items and fails the compile.

**grok · grok-4.7-high (4/10).** Over-engineered (typed arrays, `IsAny`,
`IsMutableMap`) and wrong on a required container: `WeakSet` is tested before
`Set`, and since `Set` structurally satisfies `WeakSet`,
`DeepReadonly<Set<{g: number}>>` becomes `WeakSet<{g: number}>`, neither readonly
nor deep. Its own `_set` test catches this and fails; it shipped anyway. The
Todo examples (selectors, an Immer-style draft) are realistic but also contain a
compile error.

**grok · grok-4.7-xhigh (7/10).** The most interesting architecture of the
field: one `Deep<T, Mode>` engine drives all four transforms, with a documented
leaf catalogue (`URL`, typed arrays, boxed primitives). It passes all 23 probes.
The examples compile and are realistic: a todo store with
`completeTodo(state, id)`, selectors over a `DeepPick` slice, a
draft/rename/patch editing flow. The objective fail comes from two
over-ambitious assertions in its own `tests.ts` (index signatures and
intersections), not from the types.

**pi · deepseek-v4-flash-high (7/10).** Correct and thoughtful: `DeepPick`
prunes paths that resolve to nothing, and arrays/tuples keep their shape (22 of
23; `Date` is walked). The Redux example uses the normalised shape Redux
recommends (`byId: Map`, `order: string[]`) with a pure `withTag` transition,
followed by a resolved config and a serialisation boundary. No action type.

**pi · deepseek-v4-pro-high (5/10).** The shortest suite (67 lines) and correct
enough (21 of 23), leaning on homomorphic mapped types. The examples are mostly
`declare const` and `declare function` stubs with no bodies, and a comment
concedes that real code would need a cast.

**pi · deltacoder-9b-q8, April (1/10).** `DeepPick` returns the value at the
path instead of a nested object, `DeepMutable` and `DeepRequired` have no
`-readonly`/`-?` modifiers, so they change nothing, and functions become `{}`.
The examples use `@ts-expect-error` on lines that do not error.

**pi · deltacoder-9b-q8, June (2/10).** Longer (478 lines) but structurally
wrong: `DeepReadonly` maps arrays to *mutable* `Array<...>`, a top-level
`Map` is walked as a plain object, and `DeepPick` returns flat `"a.b.c"` keys. The examples are long and
domain-flavoured but lean on casts and fail the compile.

**pi · fable-5.1-xhigh (9/10).** 23 of 23 plus touches nobody else bothered
with: an `unknown extends T` guard so `any` and `unknown` pass through, and a
`DeepKeyOf` path type (depth-capped at 10) that makes `DeepPick` reject typos at
compile time. The examples are the real thing: `reducer(state, action: Action)`
over a discriminated `Action` union with an exhaustive `switch`, a validator
that turns a `DeepPartial` wire type into a `DeepRequired` domain type, and a
runtime `select(source, paths)` with `const` type parameters whose return type
is `DeepPick<T, P[number]>`.

**pi · gemma-4-26b-q6k, April (2/10).** Functions become `{}`, tuples collapse,
`DeepMutable` never strips `readonly`, and `DeepPick` cannot merge sibling paths
(its own comment says so). The examples are type aliases with no code.

**pi · gemma-4-26b-q6k, June (1/10).** Only `types.ts` was delivered: no
`tests.ts`, no `examples.ts`, and `DeepPickRefined` is a literal `{}` under a
"placeholder for now" comment. The objective grader still reports "compiles"
because a lone `types.ts` compiles, which is a blind spot worth knowing about.

**pi · opus-4.6 (7/10).** Explicit variadic tuple recursion done right, and a
genuine reducer: `reducer(state, action: { type: string })` with a
`TOGGLE_THEME` case over a normalised `byId`/`allIds` store. The action is only
loosely typed, `DeepPartial` turns tuples into arrays, and the PATCH example's
`updateUser` calls itself unconditionally, so running it would overflow the stack.

**pi · opus-4.7-high (7/10).** 22 of 23 with explicit tuple and
readonly-versus-mutable array handling. A typed
`reducer(state, action: { type: "toggle-theme" })`, a mention of Immer drafts
via `DeepMutable`, and a telemetry `DeepPick` motivated by keeping PII out of
analytics. `AnyFunction` uses `any`.

**pi · opus-4.8-high (7/10).** Clean and `any`-free (21 of 23). Runnable
examples: `addCartItem(state, item)` builds a `DeepMutable` draft and returns it
as readonly state, plus a resolved config and a projection. No action type.

**pi · opus-4.8-xhigh (6/10).** Same design and the same 21 of 23. Its
`reducer(state)` takes no action at all, so it is a state transform wearing a
reducer's name, and the draft example uses a `structuredClone(...) as` cast.

**pi · opus-5-high (7/10).** `DeepPick` is constrained by a `DeepPaths<T>`
union, so invalid paths fail at the call site. The examples include a real
recursive `deepMerge` (with its single cast explicitly called out) and a
`completeUser` that promotes a `DeepPartial` payload to `DeepRequired`. The
"reducer" is a one-argument `toggleSidebar`. `Date` is walked (21 of 23).

**pi · opus-5-xhigh (8/10).** 22 of 23 with `DeepKeys`-validated paths and
`Date`/`RegExp` as atoms. The Redux example uses the Redux Toolkit naming
convention (`{ type: "cart/add" } | { type: "user/rename" }`), a
`reduce(state, action)` that mutates a draft and returns it as readonly state,
and a hand-written structural clone that keeps `Map`/`Set` without casts, plus a
generic `deepMerge<T>(base, patch: DeepPartial<T>)`.

**pi · opus-5.5-medium (8/10).** 23 of 23 in 87 lines. `DeepPick` is
path-validated with a depth cap, and the example set is short but real: a
discriminated `Action` union with an exhaustive reducer, typed defaults via
`DeepRequired`, a PATCH type built from `DeepPartial<Omit<...>>`.

**pi · opus-5.5-high (9/10).** 23 of 23. The reducer uses an `Action` union,
and next to it sits an Immer-style `produce(state, recipe)` whose draft is built
by a structural copy, not a cast. The config loader merges deeply and then
*proves* the result with an `isServerConfig` type guard instead of asserting it.
There are no casts in the domain code.

**pi · opus-5.5-xhigh (10/10).** The deepest answer. `DeepPick` works through
arrays (`"orders.id"`), paths are validated, `unknown`/`any` and abstract
constructors are treated as atoms, and all 23 probes pass. The examples are a
small, runnable application: an overloaded `deepFreeze` that really calls
`Object.freeze`, a reducer over a three-case `Action` union replayed with
`Array.prototype.reduce`, `@ts-expect-error` proofs of forbidden mutations, a
config resolver with a labelled optional tuple, and a `leakyProjection` that
proves a password hash cannot sneak into the `DeepPick` public shape.

**qwen · qwen3.5-coder (6/10).** The most realistic data on the board: its
`GitHubUser`/`GitHubRepo` interfaces are genuine GitHub REST field names
(`stargazers_count`, `x-ratelimit-remaining`). But `DeepReadonly` only matches
`Map`, so a `ReadonlyMap` input is walked into a bag of methods, and the
examples hide bugs behind casts: `mergeConfig` is a shallow spread cast to
`ServerConfig` (nested defaults are lost), and `normalizeRepo` casts readonly
input to mutable and edits it in place. Selectors only; no reducer.

### Challenge 07 - per model

A compact view of the stress results before the prose. "Hidden" is the 16
unpublished cases; "Heavy" is `pred 5`, `2^4`, `3^3`, `2^5`, `fact 2`,
`fact 3`. "Over budget" is what the solution does when a term needs more than it
can give.

| Run | Bound | Hidden | Heavy | Over budget |
| --- | ---: | :---: | :---: | --- |
| antigravity · gemini-3.1-pro-high | 30 | 16/16 | 2/6 | `DIVERGE` from `2^4` up |
| antigravity · gemini-3.7-flash-high | 100 | 16/16 | 4/6 | TS2589 on `fact` |
| antigravity · gemini-3.8-flash-high | 100 | 16/16 | 4/6 | `DIVERGE` on `fact` |
| claude · opus-4.8 | 300 | 16/16 | 5/6 | `DIVERGE` on `fact 3` |
| codex · gpt-5.5 | 100 | 15/16 | 4/6 | TS2589 on `fact` and growing Ω |
| gemini · gemini-3-flash-preview | 20 | 0/16 | 0/6 | parser loops into TS2589 on every input |
| gemini · gemini-3.1-pro-preview | 400 | 16/16 | 5/6 | `DIVERGE` on `fact 3` |
| grok · grok-4.6-high | 128* | 15/16 | 4/6 | TS2589 on `fact` and growing Ω |
| grok · grok-4.6-xhigh | 64 | 16/16 | 4/6 | TS2589 on `fact` |
| grok · grok-4.7-high | 58 | 16/16 | 3/6 | `DIVERGE` on `2^5`, TS2589 on `fact` |
| grok · grok-4.7-xhigh | 48 | 16/16 | 3/6 | `DIVERGE` on `2^5` and `fact` |
| pi · deepseek-v4-flash-high | 400 | 15/16 | 4/6 | TS2589 on `fact` and growing Ω |
| pi · deepseek-v4-pro-high | 100 | 16/16 | 3/6 | TS2589 from `pred 3` up |
| pi · deltacoder-9b-q8 | - | - | - | does not parse |
| pi · fable-5.1-xhigh | 5,100 | 16/16 | 6/6 | `fact 4` correct but with TS2589 |
| pi · gemma-4-26b-q6k | - | - | - | empty file |
| pi · opus-5-high | 400 | 15/16 | 4/6 | TS2589 on `fact` and growing Ω |
| pi · opus-5-xhigh | 600 | 15/16 | 4/6 | TS2589 on `fact` and growing Ω |
| pi · opus-5.5-medium | 10,000 | 15/16 | 6/6 | `fact 4` correct but with TS2589 |
| pi · opus-5.5-high | 5,000 | 15/16 | 6/6 | TS2589 on `fact 4` |
| pi · opus-5.5-xhigh | 10,000 | 16/16 | 6/6 | `fact 4` clean in about 6s |

\* per subterm, not per normalisation (see below). The only hidden-case failure
among working solutions is the growing divergent term, which the README does not
require (Ω is the only diverging grader input). The small-bound runs "pass" it
only because they give up before the term gets deep.

**antigravity · gemini-3.1-pro-high (6/10).** Genuinely general, with a
creative twist: a tail-recursive shift-reduce parser instead of recursive
descent, and a one-pass substitution. But the 30-step bound is the tightest on
the board, sitting just above the published cases, so `2^4` (31 steps) is
already reported as `DIVERGE`. The notes are honest about the 30 steps but
over-claim that recursive descent "fails on even modestly sized inputs"; a dozen
other runs show it does not. Every internal type is exported.

**antigravity · gemini-3.7-flash-high (6/10).** A textbook pipeline with
numeric-literal arithmetic built from tuples, which makes it the slowest of the
passing runs on heavy terms (about 11s). The notes state a 120-step bound
(`BuildTuple<120>`); the code runs `BuildTuple<100>`. It is general, but the
write-up does not describe the shipped code.

**antigravity · gemini-3.8-flash-high (7/10).** Parses straight into de Bruijn
indices, uses a correct one-pass `Subst`, and a 100-step loop that returns
`DIVERGE` cleanly instead of crashing when the budget runs out. The notes are
accurate, including the observation that the bound could go to about 250-300.
Unknown characters are silently dropped rather than rejected.

**claude · opus-4.8 (8/10).** A clean, textbook normaliser (tokeniser,
recursive descent, `ShiftUp`/`Subst`/`ShiftDown`, one-step `Step`, 300 fuel).
It handles `fact 2` and returns `DIVERGE` for `fact 3`, exactly as the notes
predict ("a big factorial could exceed it"). The notes list tested cases that
match what was re-run here.

**codex · gpt-5.5 (7/10).** Minimal and correct: unary naturals, a 100-element
fuel tuple written out literally, a `string extends S` guard for non-literal
input. The notes are brief but accurate. Heavier terms end in TS2589 rather
than `DIVERGE`.

**gemini · gemini-3-flash-preview (2/10).** The design on paper is right, but
`ParseApp` keeps consuming until `ParseAtom` returns `never`, and
`never extends [infer A, infer R]` is vacuously true, so the parser recurses
forever. Every input, including `\x.x`, ends in TS2589; the grader shows 12 of 13
assertions failing (only the negative control holds). The notes state a 50-step
bound; the code uses 20. The notes' "self-evaluation" was never run.

**gemini · gemini-3.1-pro-preview (8/10).** A faithful TaPL implementation with
fuel composed as `N400 = N200<N200>`, which reads nicely. It passes every
hidden case, including the growing divergent term, and handles `fact 2`. The
notes justify the 400 bound against the instantiation limit, but claim "no
known limitations besides the hard step limit", which is slightly generous.

**grok · grok-4.6-high (6/10).** The one architecture that differs from
"step from the root, loop": weak-head normalisation followed by normalising
the pieces, with an immediate redex handled tail-recursively so Ω burns fuel
cheaply. That is elegant, but the fuel is not threaded: `Whnf` returns only a
term, and `Nf` passes the same budget into every child, so "128 beta
reductions" in the notes is really 128 per subterm. Heavy terms end in TS2589.

**grok · grok-4.6-xhigh (6/10).** The standard one-step design with a 64-step
gas tuple and a thoughtful touch: when the gas runs out it checks for one more
redex, so a term that needs exactly 64 steps is not misreported. The notes are
modest and honest ("64 is enough for the closed Church/boolean/K cases").

**grok · grok-4.7-high (5/10).** General, but deliberately small: 58 steps,
and `Succ`/`Pred` are lookup tables covering 0-64, so larger indices fall off
the end. These are arithmetic tables, not answer tables, and the notes disclose
both limits plainly. Even so, `2^5` returns `DIVERGE` and `fact` hits TS2589.

**grok · grok-4.7-xhigh (6/10).** The most principled fuel accounting of the
WHNF-style solutions: every result is `Done<term, remainingFuel>`, threaded
through both sides of an application. But it pairs that design with a 48-step
bound and a successor table capped at 40, so it gives up earlier than almost
anyone. The notes are honest about both caps.

**pi · deepseek-v4-flash-high (6/10).** 400 steps plus a one-step cycle check
(`StructEq<Term, Next>`), which catches Ω after a single step. It is still a
general mechanism, not a special case for the published Ω, but it only catches
period-one loops. The notes are candid that compiler limits, not fuel, are the
real ceiling, and heavy terms confirm it with TS2589.

**pi · deepseek-v4-pro-high (4/10).** It passes the grader, but it is the
shallowest of the passing solutions. `NormalizeLoop<Step<T>, ...>` passes an
unevaluated `Step` into the next iteration while `HasRedex` rescans the tree
each step, and whitespace stripping is not tail-recursive. `pred 3` (about 13
steps) already ends in TS2589. The notes say the limits are "sized for the
challenge's inputs", which is true only in the narrowest sense.

**pi · deltacoder-9b-q8 (1/10).** Not a working normaliser: the file has
syntax errors (a malformed template literal type in `ToDB`), variables are
never resolved to indices, and for an abstraction it simply echoes the raw
named body (`\x.x` would render as `\.x`). The notes claim cases it cannot
produce. There is no lookup table; it just does not work.

**pi · gemma-4-26b-q6k (0/10).** `solution.ts` is empty and there are no notes.

**pi · fable-5.1-xhigh (9/10).** A compact 198-line solution with the cleverest
budget: `BurstSize = 50` steps nested inside `Bursts = 100` rounds, both
tail-recursive, so the product (about 5,100 steps) goes past the 1,000-iteration
tail-call cap without any exotic machinery. Substitution is a single-pass
`Instantiate` on tuple naturals. It is the only run outside the opus-5.5 trio to
clear every heavy case, including `fact 3`, and its notes measured `fact 4`
precisely: correct value plus TS2589, which is what the re-run shows.

**pi · opus-5-high (8/10).** Fuses the three textbook substitution passes into
one (`SubstTop`), with a measured justification: `2^5` goes from TS2589 to a
clean result. The notes include a step-count table for common terms and a
measured depth ceiling (a Church numeral with 43 nested applications
normalises, 44 does not). Honest and well engineered, but the ceiling is still
depth, so `fact` fails with TS2589.

**pi · opus-5-xhigh (8/10).** A textbook normaliser whose notes record two
genuine traps. Constraining helpers with a recursive `Term` union makes TS
expand it eagerly. And using `never` as a parse failure is dangerous because
`never extends Parsed<infer T, infer R>` is vacuously true, the exact bug that
sank gemini-3-flash. It predicts, correctly, that `fact 3` and growing
divergence hit TS2589 rather than the 600-step bound.

**pi · opus-5.5-medium (9/10).** Replaces "step from the root" with a
Krivine-style machine (a focus term plus an argument stack) run in bursts of
500 transitions, followed by weak-head-then-spine normalisation. A base-100
two-digit fuel counter gives a 10,000-step budget with O(1) ticks. It computes
`fact 3` and, as the notes say, the right `fact 4` alongside a TS2589. The
`tests.ts` next to it includes `pow`, `pred` and factorial.

**pi · opus-5.5-high (9/10).** The most engineered solution: every stage
(parser, substitution, reducer, renderer) is a flat, explicitly stacked machine
run in 750-iteration slices, and each node caches its free level and
normal-form flag, so closed subterms are shared and normal subterms are
skipped. A zipper reducer never rescans from the root. The notes describe
differential testing against 300 random terms and 120 arithmetic expressions,
and are honest that `fact 4` and growing divergence exceed the compiler's
budget, which the re-run confirms. It cost 1,035s to write.

**pi · opus-5.5-xhigh (10/10).** The only solution for which term depth is
irrelevant: linked-list stacks and paths give O(1) push and pop at any depth,
nodes carry a scope annotation so rewriting skips anything it cannot touch, and
counters use an O(1) successor table. It is the only run to return `DIVERGE`
for the growing divergent term under a real budget, its notes claim (and the
re-run confirms) `fact 4` cleanly in about 6 seconds, and the 10,000-step
bound was tested at the exact boundary (10,000 normalises, 10,001 does not).

### Cross-cutting summary

- **Who showed real Redux-like signatures in ch01.** A reducer of the form
  `(state, action) => state` over a typed, discriminated action union appears
  in **fable-5.1-xhigh**, **opus-5-xhigh** (Redux Toolkit style `"cart/add"`
  names), **opus-5.5-medium**, **opus-5.5-high** (plus an Immer-style
  `produce`) and **opus-5.5-xhigh** (replayed with `Array.prototype.reduce`
  over a `deepFreeze`d store). **pi · opus-4.7-high** has a typed single-case
  action, **pi · opus-4.6** a loosely typed `{ type: string }` action over a
  normalised `byId`/`allIds` store, and **gemini-2.5-pro** a real `ADD_POST`
  reducer whose file does not compile.
- **Redux-adjacent but no action.** Selectors, state transitions or
  Immer-style drafts without an action type: claude opus-4.6 and opus-4.8,
  deepseek-v4-flash (normalised `byId`/`order`), grok-4.6-high and 4.6-xhigh
  (both fail to compile), grok-4.7-high and 4.7-xhigh, pi opus-4.8-high,
  opus-4.8-xhigh (a one-argument `reducer(state)`), opus-5-high, qwen and
  codex-5.5.
- **Only a state type or constant.** antigravity gemini-3.1-pro-high and
  3.7-flash-high, gemini-3.1-pro-preview, gemini-3-flash, codex-5.4,
  deepseek-v4-pro, deltacoder (both), gemma April; gemma June shipped no
  examples at all. antigravity gemini-3.8-flash-high is the best of this group
  on realism (config merge, PII projection) despite a state-only Redux example.
- **Genuine general normalisers vs overfit ones.** Every ch07 submission that
  works is a genuine, general normaliser. None is a lookup table: all 18 working
  runs pass the 16 unpublished cases (bar the growing divergent term) with
  expectations from the reference implementation. The only tables are
  arithmetic helpers (grok-4.7's index successor tables, opus-5.5-xhigh's
  successor counter). The closest thing to overfitting is **tuning the step
  bound to the published cases**: 30 (antigravity gemini-3.1-pro-high), 48
  (grok-4.7-xhigh), 58 (grok-4.7-high) and 64 (grok-4.6-xhigh) all sit just
  above what the grader needs, and fail on `2^4` or `2^5`. deepseek-v4-pro is
  general in form but so shallow in practice that `pred 3` breaks it.
- **The real frontier is the compiler, not the fuel.** Past a few hundred
  steps, one-step-from-the-root reducers die with TS2589 whatever their fuel.
  Only four runs reorganised the computation around TypeScript's limits: fable
  (nested bursts), opus-5.5-medium (Krivine machine in bursts), opus-5.5-high
  (sliced stack machines with caches) and opus-5.5-xhigh (depth-independent
  linked stacks). They are the only ones to compute `fact 3`.
- **Honesty of notes.** Most notes are accurate. The exceptions are specific:
  gemini-3-flash (claims 50 steps, runs 20, and fails everything it says it
  passes), antigravity gemini-3.7-flash (claims 120, runs 100), grok-4.6-high
  (a "128-step" bound that is really per subterm), deltacoder (claims cases it
  cannot produce) and gemini-3.1-pro-preview ("no known limitations"). The
  opus-5 and opus-5.5 notes stand out for measured, falsifiable limits that the
  re-runs confirmed.
- **The objective ch01 gate measures the harness as much as the types.**
  grok-4.7-xhigh has some of the best ch01 types on the board yet fails because
  two assertions in its own tests are too ambitious; grok-4.6-high and
  4.6-xhigh fail on example code, not on `DeepReadonly`. Conversely, gemma June
  passes with only a `types.ts` and a placeholder. The depth scores above are
  the correction.
- **The presence checks for 02 and 03 hide broken work.** `SCORES.md` marks
  every ch02 and ch03 deliverable `ok` when the files exist (and ch03 carries
  the theme line), yet qwen's sketch is a blank canvas and three diagrams do not
  render. Only rendering them reveals it.
- **A 9/9 grade can be luck.** The ch04 grader samples `roundCurrency`; the
  `Number.EPSILON` fix (both gemini-2.5-pro and gemini-3.1-pro) passes the
  sample and fails 65,613 of 10,000,000 in-contract inputs. The fixes that
  round to thousandths first, go through the decimal string, or add a `1e-9`
  nudge are exhaustively correct.
- **Repo comprehension lags code skill.** The same models that write the best
  type-level code misdescribe which script writes which report in ch03; only
  four runs wire the tooling correctly end to end.

### Corrections to earlier notes

- The gemini-3-flash entry above attributes its ch07 failure to "a 50-step
  reduction bound". Reading the code shows the bound is 20, not 50, and the
  failure is a parser bug (`never` from `ParseAtom` loops `ParseApp` into
  TS2589) that fails even `\x.x`. The cross-cutting bullet "50 steps fails
  (gemini-3-flash)" should be read the same way: the step bound was not the
  deciding factor.
- The earlier cross-cutting bullet names three runs that normalised ch07. With
  the 2026-09-22 runs there are now 18 passing submissions (see the second
  README table).
- The gemini-3.1-pro-preview and gemini-2.5-pro entries call the 9/9 bug hunt
  rock-solid or excellent. Their `roundCurrency` fix is wrong on 65,613
  in-contract inputs the grader never tries (see *Challenges 02-06*).
- The gemma June entry calls its bug hunt near-perfect. It shipped no `bugs.md`,
  and its `mapLimit` exceeds the concurrency limit.
- The qwen entry reports a perfect core sweep. Its ch02 sketch throws on load
  and renders nothing; the presence check cannot see that.
- The April deltacoder entry calls its ch02 sketch working. It runs, but four
  planets orbit outside a 1280x800 view and its moons are zero-size.
