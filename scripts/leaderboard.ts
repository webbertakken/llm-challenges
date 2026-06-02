/**
 * Generates the model scoreboard inside README.md, between the markers
 *   <!-- LEADERBOARD:START --> ... <!-- LEADERBOARD:END -->
 *
 * It is purely derived data: objective per-challenge grades come from the
 * generated SCORES.md, durations come from each run's `duration-<n>-seconds.txt`
 * marker. Nothing here re-grades or touches a result folder.
 *
 *   npx tsx scripts/leaderboard.ts          # rewrite the README block
 *   npx tsx scripts/leaderboard.ts --check  # fail if the block is stale
 *
 * Scoring rubric (per challenge, weights chosen to reflect difficulty and how
 * objective the grader is — visual/presence challenges are worth less than the
 * behaviourally graded ones):
 *
 *   01 deep-readonly   15  compiles clean under `tsgo --strict`
 *   02 solar-system    10  deliverables present (visual / manual)
 *   03 plantuml        10  deliverables present + `!theme blueprint`
 *   04 bug-hunt        15  scaled by grader score (X/9)
 *   05 reverse-eng     15  behavioural equivalence over 5k inputs
 *   06 type-eval       15  compile-time assertion grader passes
 *   07 type-lambda     20  frontier; compile-time assertion grader passes
 *                     ───
 *                     100
 *
 * Runs split into two cohorts because challenges 04-07 did not exist when the
 * earliest runs were made: the "full gauntlet" (attempted any of 04-07, scored
 * out of 100) and the "core three" (only 01-03, scored out of 35).
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const README = resolve(root, "README.md");
const SCORES = resolve(root, "SCORES.md");
const START = "<!-- LEADERBOARD:START -->";
const END = "<!-- LEADERBOARD:END -->";

const CHALLENGES = [
  "challenge01-deep-readonly",
  "challenge02-solar-system",
  "challenge03-repo-overview-plantuml",
  "challenge04-bug-hunt",
  "challenge05-reverse-engineer",
  "challenge06-type-eval",
  "challenge07-type-lambda",
] as const;

/** Per-challenge maximum points; the array order matches CHALLENGES. */
const WEIGHTS = [15, 10, 10, 15, 15, 15, 20] as const;
const CORE_MAX = WEIGHTS[0] + WEIGHTS[1] + WEIGHTS[2]; // 35

const RESULT = /_\d{4}-\d{2}-\d{2}(_.*)?$/;
const FOLDER = /^([a-z0-9]+)_(.+)_(\d{4}-\d{2}-\d{2})(?:_(.+))?$/;
const DURATION = /^duration-(\d+)-seconds\.txt$/;
const MAX_SANE_SECONDS = 86_400; // anything larger is a corrupt marker

interface Cell {
  readonly raw: string;
  readonly delivered: boolean;
  readonly passed: boolean;
  readonly points: number;
}

interface Model {
  readonly key: string;
  readonly harness: string;
  readonly model: string;
  readonly date: string;
  readonly cells: (Cell | null)[];
  readonly durations: (number | null)[];
}

/** Grade one raw SCORES.md cell for a given challenge index. */
function gradeCell(index: number, raw: string): Cell | null {
  const text = raw.trim();
  if (text === "" || text === "—") return null;
  const max = WEIGHTS[index];
  switch (index) {
    case 0: // ch01: compiles?
      return cell(text, text.includes("compiles"), max);
    case 1: // ch02: presence only
      return cell(text, text === "ok", max);
    case 2: // ch03: presence + theme; "no-theme" is a partial deliverable
      if (text === "ok") return cell(text, true, max);
      return { raw: text, delivered: true, passed: false, points: max / 2 };
    case 3: {
      // ch04: "X/9"
      const m = /^(\d+)\/(\d+)$/.exec(text);
      if (!m) return { raw: text, delivered: true, passed: false, points: 0 };
      const ratio = Number(m[1]) / Number(m[2]);
      return { raw: text, delivered: true, passed: ratio >= 1, points: max * ratio };
    }
    case 4: // ch05: equivalence
      return cell(text, text.includes("equiv"), max);
    case 5: // ch06: type-eval pass/fail
    case 6: // ch07: type-lambda pass/fail
      return cell(text, text.includes("pass"), max);
    default:
      return null;
  }
}

function cell(raw: string, passed: boolean, max: number): Cell {
  return { raw, delivered: true, passed, points: passed ? max : 0 };
}

/** Canonicalise a result-folder name, merging known naming variants. */
function canon(folder: string): { harness: string; model: string; date: string } | null {
  const m = FOLDER.exec(folder);
  if (!m) return null;
  const harness = m[1];
  const date = m[3];
  const suffix = m[4];
  if (suffix) return null; // e.g. `_altered` re-runs are not distinct models
  let model = m[2].toLowerCase().replaceAll("_", "-");
  // Same run, different label conventions:
  if (model === "claude-opus-4-6") model = "opus-4.6";
  if (model === "gemma-4-26b-a4b") model = "gemma-4-26b-q6k";
  if (model === "gemma-4-26b-q8-0") model = "gemma-4-26b-q8_0";
  return { harness, model, date };
}

/** Parse the generated SCORES.md into folder -> 7 raw cells. */
function parseScores(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const line of readFileSync(SCORES, "utf8").split("\n")) {
    const m = /^\|\s*`([^`]+)`\s*\|(.+)\|\s*$/.exec(line);
    if (!m) continue;
    const cells = m[2].split("|").map((c) => c.trim());
    if (cells.length !== 7) continue;
    out.set(m[1], cells);
  }
  return out;
}

function listDirs(path: string): string[] {
  try {
    return readdirSync(path).filter((n) => statSync(resolve(path, n)).isDirectory());
  } catch {
    return [];
  }
}

function readDuration(challenge: string, folder: string): number | null {
  for (const entry of readdirSync(resolve(root, challenge, folder))) {
    const m = DURATION.exec(entry);
    if (m) {
      const secs = Number(m[1]);
      return secs > MAX_SANE_SECONDS ? null : secs;
    }
  }
  return null;
}

function collectModels(): Model[] {
  const scores = parseScores();
  const models = new Map<string, Model>();
  CHALLENGES.forEach((challenge, index) => {
    for (const folder of listDirs(resolve(root, challenge))) {
      if (folder === "grader" || !RESULT.test(folder)) continue;
      const id = canon(folder);
      if (!id) continue;
      const key = `${id.harness}|${id.model}|${id.date}`;
      const model =
        models.get(key) ??
        {
          key,
          harness: id.harness,
          model: id.model,
          date: id.date,
          cells: Array(7).fill(null),
          durations: Array(7).fill(null),
        };
      const raw = scores.get(folder)?.[index] ?? "—";
      const graded = gradeCell(index, raw);
      // A model may span sibling folders (naming variants); keep the better cell.
      const existing = model.cells[index];
      if (graded && (!existing || graded.points >= existing.points)) {
        model.cells[index] = graded;
      }
      const dur = readDuration(challenge, folder);
      if (dur !== null && model.durations[index] === null) model.durations[index] = dur;
      models.set(key, model);
    }
  });
  return [...models.values()];
}

interface Scored {
  readonly model: Model;
  readonly full: boolean;
  readonly delivered: number;
  readonly passed: number;
  readonly score: number;
  readonly totalSeconds: number | null;
  readonly avgSeconds: number | null;
}

function score(model: Model): Scored {
  let delivered = 0;
  let passed = 0;
  let score = 0;
  for (const c of model.cells) {
    if (!c) continue;
    if (c.delivered) delivered++;
    if (c.passed) passed++;
    score += c.points;
  }
  const full = model.cells.slice(3).some((c) => c !== null);
  const times = model.durations.filter((d): d is number => d !== null);
  const totalSeconds = times.length ? times.reduce((a, b) => a + b, 0) : null;
  const avgSeconds = times.length ? Math.round(totalSeconds! / times.length) : null;
  return { model, full, delivered, passed, score: Math.round(score), totalSeconds, avgSeconds };
}

function bySpeed(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

function rank(rows: Scored[]): Scored[] {
  // Ties favour the more capable, more complete run before the faster one.
  return [...rows].sort(
    (a, b) =>
      b.score - a.score ||
      b.passed - a.passed ||
      b.delivered - a.delivered ||
      bySpeed(a.avgSeconds, b.avgSeconds) ||
      a.model.key.localeCompare(b.model.key),
  );
}

const secs = (n: number | null): string => (n === null ? "—" : `${n}s`);
const name = (m: Model): string => `${m.harness} · ${m.model}`;
const MEDALS = ["🥇", "🥈", "🥉"];

function fullTable(rows: Scored[]): string[] {
  const ranked = rank(rows);
  // The speed badge only rewards a run that actually delivered every challenge,
  // so a model that was fast on a handful cannot claim it.
  const fastest = ranked
    .filter((r) => r.delivered === CHALLENGES.length && r.avgSeconds !== null)
    .reduce<Scored | null>((best, r) => (best && best.avgSeconds! <= r.avgSeconds! ? best : r), null);
  const out = [
    "### Full gauntlet — all seven challenges",
    "",
    "Scored out of 100 across challenges 01-07. `Done` counts delivered",
    "challenges, `Pass` counts objective passes (ch04 must be a perfect 9/9).",
    "Times only cover challenges that left a duration marker.",
    "",
    "| # | Harness · Model | Done | Pass | Score | Avg ⏱ | Total ⏱ |",
    "| --- | --- | :---: | :---: | :---: | ---: | ---: |",
  ];
  ranked.forEach((r, i) => {
    const medal = i < MEDALS.length && r.score >= 50 ? `${MEDALS[i]} ` : "";
    const star = r === fastest ? " ⚡" : "";
    out.push(
      `| ${medal}${i + 1} | **${name(r.model)}** | ${r.delivered}/7 | ${r.passed}/7 | **${r.score}**/100 | ${secs(r.avgSeconds)}${star} | ${secs(r.totalSeconds)} |`,
    );
  });
  out.push("");
  return out;
}

function coreTable(rows: Scored[]): string[] {
  const ranked = rank(rows);
  const out = [
    "### Core three — challenges 01-03 only",
    "",
    `Earlier runs made before challenges 04-07 existed. Scored out of ${CORE_MAX}`,
    "(deep-readonly 15, solar-system 10, plantuml 10).",
    "",
    "| Harness · Model | Pass | Score | Avg ⏱ | Total ⏱ |",
    "| --- | :---: | :---: | ---: | ---: |",
  ];
  for (const r of ranked) {
    out.push(
      `| **${name(r.model)}** | ${r.passed}/3 | **${r.score}**/${CORE_MAX} | ${secs(r.avgSeconds)} | ${secs(r.totalSeconds)} |`,
    );
  }
  out.push("");
  return out;
}

function render(): string {
  const scored = collectModels().map(score);
  const full = scored.filter((s) => s.full);
  const core = scored.filter((s) => !s.full);
  return [
    START,
    "",
    "_Generated by `scripts/leaderboard.ts` from the objective grades in_",
    "_[`SCORES.md`](SCORES.md) and each run's duration marker. Do not edit by hand._",
    "",
    ...fullTable(full),
    ...coreTable(core),
    `Per-model strengths and weaknesses: [\`docs/results/interpretations.md\`](docs/results/interpretations.md).`,
    "",
    END,
  ].join("\n");
}

function inject(readme: string, block: string): string {
  const s = readme.indexOf(START);
  const e = readme.indexOf(END);
  if (s === -1 || e === -1 || e < s) {
    throw new Error(`README.md is missing the ${START} / ${END} markers.`);
  }
  return readme.slice(0, s) + block + readme.slice(e + END.length);
}

const block = render();
const readme = readFileSync(README, "utf8");
const updated = inject(readme, block);

if (process.argv.includes("--check")) {
  if (readme !== updated) {
    console.error("README leaderboard is stale. Run: npx tsx scripts/leaderboard.ts");
    process.exit(1);
  }
  console.log("README leaderboard is up to date.");
} else if (process.argv.includes("--print")) {
  console.log(block);
} else {
  writeFileSync(README, updated);
  console.log(`Updated leaderboard in ${README}`);
}
