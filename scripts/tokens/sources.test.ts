import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NOT_COUNTED, RUNS, UNAVAILABLE } from "./sources.ts";

const RUN_KEY = /^[a-z0-9]+\/[a-z0-9._-]+\/\d{4}-\d{2}-\d{2}$/;

describe("sources", () => {
  const counted = RUNS.map((r) => r.run);
  const unavailable = UNAVAILABLE.map((r) => r.run);

  it("names every run as harness/model/date, once", () => {
    const all = [...counted, ...unavailable];
    for (const run of all) assert.match(run, RUN_KEY);
    assert.equal(new Set(all).size, all.length);
  });

  it("never reads the same log twice", () => {
    const paths = [...RUNS.flatMap((r) => r.sources), ...NOT_COUNTED.map((n) => n.source)].map((s) => s.path);
    assert.equal(new Set(paths).size, paths.length);
  });

  it("only windows pi logs", () => {
    for (const source of RUNS.flatMap((r) => r.sources)) {
      if (source.window) assert.equal(source.reader, "pi", source.path);
    }
  });

  it("attributes every uncounted attempt to a counted run", () => {
    for (const entry of NOT_COUNTED) assert.ok(counted.includes(entry.run), entry.run);
  });

  it("keeps notes free of table pipes", () => {
    for (const note of [...RUNS.map((r) => r.note ?? ""), ...NOT_COUNTED.map((n) => n.reason), ...UNAVAILABLE.map((u) => u.reason)]) {
      assert.ok(!note.includes("|"), note);
    }
  });
});
