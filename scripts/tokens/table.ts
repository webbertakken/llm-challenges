/**
 * The per-run token table in TOKENS.md: rendered by scripts/tokens.ts and read
 * back by scripts/leaderboard.ts, so the leaderboard never needs the raw logs.
 */
import { totalTokens, type Usage } from "./usage.ts";

/**
 * How a run's usage was measured:
 * - `session`     whole harness sessions dedicated to the run
 * - `window`      a hand-set time window cut from an interactive session
 * - `unavailable` no log survives
 */
export type Basis = "session" | "window" | "unavailable";

export interface TokenRow {
  readonly run: string;
  readonly basis: Basis;
  readonly usage: Usage | null;
  readonly note: string;
}

const HEADER = [
  "| Run | Basis | Calls | Fresh input | Cache read | Cache write | Output | Reasoning | Total | Cost | Notes |",
  "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
];
const NONE = "—";
const ROW = /^\| `([^`]+)` \| (session|window|unavailable) \|(.*)\|\s*$/;

const exact = (n: number): string => n.toLocaleString("en-GB");
const orNone = (n: number | null, format: (n: number) => string): string => (n === null ? NONE : format(n));

export function renderTokensTable(rows: readonly TokenRow[]): string[] {
  return [
    ...HEADER,
    ...rows.map((row) => {
      if (row.note.includes("|")) throw new Error(`note for ${row.run} must not contain "|"`);
      const u = row.usage;
      const cells = u
        ? [
            exact(u.calls),
            exact(u.input),
            exact(u.cacheRead),
            exact(u.cacheWrite),
            exact(u.output),
            orNone(u.reasoning, exact),
            exact(totalTokens(u)),
            orNone(u.costUsd, (c) => `$${c.toFixed(2)}`),
          ]
        : Array<string>(8).fill(NONE);
      return `| \`${row.run}\` | ${row.basis} | ${cells.join(" | ")} | ${row.note} |`;
    }),
  ];
}

const readExact = (cell: string): number => {
  const n = Number(cell.replaceAll(",", ""));
  if (!Number.isFinite(n)) throw new Error(`not a token count: "${cell}"`);
  return n;
};
const readOptional = (cell: string, read: (c: string) => number): number | null => (cell === NONE ? null : read(cell));

export function parseTokensTable(markdown: string): Map<string, TokenRow> {
  const rows = new Map<string, TokenRow>();
  for (const line of markdown.split("\n")) {
    const m = ROW.exec(line);
    if (!m) continue;
    const [, run, basis, rest] = m;
    if (rows.has(run)) throw new Error(`TOKENS.md lists ${run} twice`);
    const cells = rest.split("|").map((c) => c.trim());
    if (cells.length !== 9) throw new Error(`TOKENS.md row for ${run} has ${cells.length + 2} columns, expected 11`);
    const [calls, input, cacheRead, cacheWrite, output, reasoning, , cost, note] = cells;
    const usage: Usage | null =
      basis === "unavailable"
        ? null
        : {
            calls: readExact(calls),
            input: readExact(input),
            cacheRead: readExact(cacheRead),
            cacheWrite: readExact(cacheWrite),
            output: readExact(output),
            reasoning: readOptional(reasoning, readExact),
            costUsd: readOptional(cost, (c) => readExact(c.replace("$", ""))),
          };
    rows.set(run, { run, basis: basis as Basis, usage, note });
  }
  return rows;
}

/** 950, 68k, 31.4M: short enough for a leaderboard cell. */
export function compactCount(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 999_500) return `${Math.round(n / 1_000)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

/** The scoreboard's `Output` and `Tokens` cells; `~` marks a windowed estimate. */
export function leaderboardCells(row: TokenRow): [output: string, total: string] {
  if (!row.usage) return [NONE, NONE];
  const mark = row.basis === "window" ? "~" : "";
  return [`${mark}${compactCount(row.usage.output)}`, `${mark}${compactCount(totalTokens(row.usage))}`];
}
