import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compactCount, parseTokensTable, renderTokensTable, type TokenRow } from "./table.ts";

const rows: TokenRow[] = [
  {
    run: "pi/opus-5.5-xhigh/2026-09-22",
    basis: "session",
    usage: { calls: 117, input: 236, cacheRead: 30_621_424, cacheWrite: 443_872, output: 361_952, reasoning: null, costUsd: 15.58 },
    note: "",
  },
  {
    run: "grok/grok-4.6-high/2026-09-22",
    basis: "session",
    usage: { calls: 43, input: 216_603, cacheRead: 2_364_672, cacheWrite: 0, output: 67_563, reasoning: 38_335, costUsd: 0.69 },
    note: "",
  },
  {
    run: "pi/opus-4.6/2026-04-03",
    basis: "window",
    usage: { calls: 12, input: 30, cacheRead: 90_000, cacheWrite: 20_000, output: 4_000, reasoning: null, costUsd: null },
    note: "cut from an interactive session",
  },
  { run: "opencode/gemma-4-26b-q8_0/2026-04-03", basis: "unavailable", usage: null, note: "run on another machine" },
];

describe("renderTokensTable", () => {
  it("writes one row per run with exact, separated counts", () => {
    const lines = renderTokensTable(rows);
    assert.match(lines[0], /^\| Run \|/);
    assert.equal(
      lines[2],
      "| `pi/opus-5.5-xhigh/2026-09-22` | session | 117 | 236 | 30,621,424 | 443,872 | 361,952 | — | 31,427,484 | $15.58 |  |",
    );
    assert.match(lines[5], /^\| `opencode\/gemma-4-26b-q8_0\/2026-04-03` \| unavailable \| — \| — /);
  });
});

describe("parseTokensTable", () => {
  it("reads back exactly what was rendered", () => {
    const parsed = parseTokensTable(["# Token usage", "", ...renderTokensTable(rows), "", "trailing prose"].join("\n"));
    assert.deepEqual([...parsed.values()], rows);
  });

  it("rejects a run listed twice", () => {
    const lines = renderTokensTable([rows[0], rows[0]]);
    assert.throws(() => parseTokensTable(lines.join("\n")), /twice/);
  });
});

describe("compactCount", () => {
  it("abbreviates to thousands and millions", () => {
    assert.equal(compactCount(950), "950");
    assert.equal(compactCount(67_563), "68k");
    assert.equal(compactCount(999_600), "1.0M");
    assert.equal(compactCount(31_427_484), "31.4M");
  });
});
