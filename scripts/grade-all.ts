/**
 * Grades every result folder across all challenges and writes SCORES.md.
 *
 *   npx tsx scripts/grade-all.ts
 *
 * Read-only with respect to result folders. Per challenge:
 *   01 deep-readonly   -> tsgo --strict compiles clean? (PASS/FAIL)
 *   02 solar-system    -> index.html + sketch.js present? (ok/--)
 *   03 plantuml        -> overview.puml(+!theme blueprint) + overview.md? (ok/--)
 *   04 bug-hunt        -> grader score X/9
 *   05 reverse-eng     -> grader equivalence (EQUIV/diff)
 *   06 type-eval       -> grader assertions (PASS/FAIL)
 *   07 type-lambda     -> grader assertions (PASS/FAIL)
 */
import { spawnSync } from "node:child_process";
import { readdirSync, statSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const RESULT = /_\d{4}-\d{2}-\d{2}(_.*)?$/;
const CHALLENGES = [
  "challenge01-deep-readonly",
  "challenge02-solar-system",
  "challenge03-repo-overview-plantuml",
  "challenge04-bug-hunt",
  "challenge05-reverse-engineer",
  "challenge06-type-eval",
  "challenge07-type-lambda",
];

const dirs = (p: string): string[] => {
  try {
    return readdirSync(p).filter((n) => statSync(resolve(p, n)).isDirectory());
  } catch {
    return [];
  }
};
const runFolders = (challenge: string): string[] =>
  dirs(resolve(root, challenge)).filter((n) => RESULT.test(n) && n !== "grader").sort();

const sh = (cmd: string, args: string[], cwd: string, timeoutMs = 90_000) =>
  spawnSync(cmd, args, { cwd, encoding: "utf8", timeout: timeoutMs });

function gradeCh01(folder: string): string {
  const dir = resolve(root, "challenge01-deep-readonly", folder);
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
  if (files.length === 0) return "—";
  const hasTsconfig = existsSync(resolve(dir, "tsconfig.json"));
  const base = ["--noEmit", "--strict", "--target", "ES2024", "--module", "NodeNext", "--moduleResolution", "NodeNext"];
  const args = hasTsconfig ? base : [...base, ...files];
  const r = sh("npx", ["tsgo", ...args], dir);
  return r.status === 0 ? "✅ compiles" : "❌ errors";
}

function presence(challenge: string, folder: string, need: string[]): string {
  const dir = resolve(root, challenge, folder);
  const ok = need.every((f) => existsSync(resolve(dir, f)));
  return ok ? "ok" : "—";
}

function gradeCh03(folder: string): string {
  const dir = resolve(root, "challenge03-repo-overview-plantuml", folder);
  const puml = resolve(dir, "overview.puml");
  if (!existsSync(puml) || !existsSync(resolve(dir, "overview.md"))) return "—";
  const theme = readFileSync(puml, "utf8").includes("!theme blueprint");
  return theme ? "ok" : "no-theme";
}

function runGrader(challenge: string, folder: string): { line: string } {
  const dir = resolve(root, challenge);
  const r = sh("npx", ["tsx", "grader/grade.ts", folder], dir, 120_000);
  return { line: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

function gradeCh04(folder: string): string {
  const { line } = runGrader("challenge04-bug-hunt", folder);
  const m = /Score:\s*(\d+)\/(\d+)/.exec(line);
  return m ? `${m[1]}/${m[2]}` : "—";
}
function gradeCh05(folder: string): string {
  const { line } = runGrader("challenge05-reverse-engineer", folder);
  if (/Result:\s*EQUIVALENT/.test(line)) return "✅ equiv";
  const m = /Mismatches:\s*(\d+)/.exec(line);
  return m ? `❌ ${m[1]} diff` : "—";
}
function gradeTypeChallenge(challenge: string, folder: string): string {
  const dir = resolve(root, challenge, folder);
  if (!existsSync(resolve(dir, "solution.ts"))) return "—";
  const { line } = runGrader(challenge, folder);
  if (/ALL ASSERTIONS PASS/.test(line)) return "✅ pass";
  if (/FAILED/.test(line)) return "❌ fail";
  return "?";
}

const allFolders = [...new Set(CHALLENGES.flatMap(runFolders))].sort();

interface Row {
  folder: string;
  cells: string[];
}
const rows: Row[] = [];
for (const folder of allFolders) {
  const cells: string[] = [];
  cells.push(runFolders("challenge01-deep-readonly").includes(folder) ? gradeCh01(folder) : "—");
  cells.push(runFolders("challenge02-solar-system").includes(folder) ? presence("challenge02-solar-system", folder, ["index.html", "sketch.js"]) : "—");
  cells.push(runFolders("challenge03-repo-overview-plantuml").includes(folder) ? gradeCh03(folder) : "—");
  cells.push(runFolders("challenge04-bug-hunt").includes(folder) ? gradeCh04(folder) : "—");
  cells.push(runFolders("challenge05-reverse-engineer").includes(folder) ? gradeCh05(folder) : "—");
  cells.push(runFolders("challenge06-type-eval").includes(folder) ? gradeTypeChallenge("challenge06-type-eval", folder) : "—");
  cells.push(runFolders("challenge07-type-lambda").includes(folder) ? gradeTypeChallenge("challenge07-type-lambda", folder) : "—");
  rows.push({ folder, cells });
  console.log(`graded ${folder}: ${cells.join(" | ")}`);
}

const header = [
  "# Scores",
  "",
  "Objective grading of every run (`scripts/grade-all.ts`). Read-only.",
  "",
  "- ch01 deep-readonly: `tsgo --strict` compiles clean",
  "- ch02 solar-system / ch03 plantuml: deliverables present (`ok`); ch03 checks `!theme blueprint`",
  "- ch04 bug-hunt: behavioural grader score /9",
  "- ch05 reverse-engineer: equivalence over 5k inputs",
  "- ch06 type-eval / ch07 type-lambda: compile-time assertion graders",
  "",
  "| Run | 01 | 02 | 03 | 04 | 05 | 06 | 07 |",
  "| --- | --- | --- | --- | --- | --- | --- | --- |",
];
for (const r of rows) header.push(`| \`${r.folder}\` | ${r.cells.join(" | ")} |`);
writeFileSync(resolve(root, "SCORES.md"), header.join("\n") + "\n");
console.log(`\nWrote SCORES.md (${rows.length} runs)`);
