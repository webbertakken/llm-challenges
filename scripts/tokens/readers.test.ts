import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  readAntigravity,
  readClaudeCode,
  readCodex,
  readGeminiCli,
  readGrok,
  readPi,
  readQwen,
} from "./readers.ts";
import { encodeMessage } from "./protobuf.test-helpers.ts";

const jsonl = (...rows: unknown[]): string => rows.map((r) => JSON.stringify(r)).join("\n") + "\n";

describe("readPi", () => {
  const assistant = (timestamp: string, model: string, usage: object) => ({
    type: "message",
    timestamp,
    message: { role: "assistant", model, usage },
  });
  const usage = (input: number, output: number, cacheRead: number, cacheWrite: number, cost: number) => ({
    input,
    output,
    cacheRead,
    cacheWrite,
    totalTokens: input + output + cacheRead + cacheWrite,
    cost: { total: cost },
  });
  const log = jsonl(
    { type: "session", timestamp: "2026-04-03T10:00:00.000Z" },
    { type: "message", timestamp: "2026-04-03T10:00:01.000Z", message: { role: "user", content: "go" } },
    assistant("2026-04-03T10:00:02.000Z", "claude-opus-4-6", usage(10, 20, 300, 40, 0.5)),
    assistant("2026-04-03T10:05:00.000Z", "gemma-4-26b-a4b", usage(1, 2, 3, 4, 0)),
    assistant("2026-04-03T10:09:00.000Z", "claude-opus-4-6", { ...usage(5, 6, 7, 8, 0.25), reasoning: 3 }),
  );

  it("sums every assistant call", () => {
    assert.deepEqual(readPi(log), {
      calls: 3,
      input: 16,
      cacheRead: 310,
      cacheWrite: 52,
      output: 28,
      reasoning: 3,
      costUsd: 0.75,
    });
  });

  it("keeps only calls inside a time window", () => {
    const u = readPi(log, { from: "2026-04-03T10:00:01.000Z", to: "2026-04-03T10:06:00.000Z" });
    assert.equal(u.calls, 2);
    assert.equal(u.output, 22);
  });

  it("keeps only calls made by one model", () => {
    const u = readPi(log, { model: "claude-opus-4-6" });
    assert.equal(u.calls, 2);
    assert.equal(u.input, 15);
  });

  it("reports reasoning as unknown when no call breaks it out", () => {
    assert.equal(readPi(log, { to: "2026-04-03T10:06:00.000Z" }).reasoning, null);
  });

  it("rejects a malformed line with its line number", () => {
    assert.throws(() => readPi('{"type":"session"}\nnot json\n'), /line 2/);
  });
});

describe("readClaudeCode", () => {
  const line = (id: string, usage: object) => ({
    type: "assistant",
    timestamp: "2026-06-03T01:00:00.000Z",
    message: { id, model: "claude-opus-4-8", usage },
  });
  const u = (input: number, output: number) => ({
    input_tokens: input,
    cache_creation_input_tokens: 100,
    cache_read_input_tokens: 1000,
    output_tokens: output,
  });

  it("counts a message once even when it is logged once per content block", () => {
    const log = jsonl(line("msg_1", u(3, 5)), line("msg_1", u(3, 9)), line("msg_2", u(4, 1)), { type: "user" });
    assert.deepEqual(readClaudeCode(log), {
      calls: 2,
      input: 7,
      cacheRead: 2000,
      cacheWrite: 200,
      output: 10,
      reasoning: null,
      costUsd: null,
    });
  });
});

describe("readCodex", () => {
  const tokenCount = (input: number, cached: number, output: number, reasoning: number) => ({
    type: "event_msg",
    payload: {
      type: "token_count",
      info: {
        total_token_usage: {
          input_tokens: input,
          cached_input_tokens: cached,
          output_tokens: output,
          reasoning_output_tokens: reasoning,
          total_tokens: input + output,
        },
      },
    },
  });

  it("takes the cumulative totals and splits cached from fresh input", () => {
    const log = jsonl(
      { type: "session_meta", payload: {} },
      tokenCount(100, 60, 10, 4),
      tokenCount(100, 60, 10, 4),
      { type: "event_msg", payload: { type: "token_count", info: null } },
      tokenCount(250, 200, 30, 12),
    );
    assert.deepEqual(readCodex(log), {
      calls: 2,
      input: 50,
      cacheRead: 200,
      cacheWrite: 0,
      output: 30,
      reasoning: 12,
      costUsd: null,
    });
  });

  it("reports zero usage for a session that never reached the model", () => {
    assert.equal(readCodex(jsonl({ type: "session_meta", payload: {} })).calls, 0);
  });
});

describe("readGeminiCli", () => {
  it("adds thoughts to output, splits cached input and keeps the last copy of a message", () => {
    const msg = (id: string, input: number, cached: number, output: number, thoughts: number) => ({
      id,
      type: "gemini",
      tokens: { input, output, cached, thoughts, tool: 1, total: input + output + thoughts },
    });
    const log = jsonl(
      { sessionId: "s", kind: "main" },
      { id: "u1", type: "user", content: [] },
      msg("a", 100, 0, 10, 5),
      msg("a", 100, 0, 12, 5),
      msg("b", 300, 250, 20, 7),
    );
    assert.deepEqual(readGeminiCli(log), {
      calls: 2,
      input: 152,
      cacheRead: 250,
      cacheWrite: 0,
      output: 44,
      reasoning: 12,
      costUsd: null,
    });
  });
});

describe("readQwen", () => {
  it("treats candidates as the whole output and thoughts as its reasoning share", () => {
    const msg = (uuid: string, prompt: number, cached: number, candidates: number, thoughts: number) => ({
      uuid,
      type: "assistant",
      usageMetadata: {
        promptTokenCount: prompt,
        candidatesTokenCount: candidates,
        thoughtsTokenCount: thoughts,
        totalTokenCount: prompt + candidates,
        cachedContentTokenCount: cached,
      },
    });
    const log = jsonl(msg("a", 1000, 900, 50, 10), msg("b", 2000, 1500, 70, 20), { type: "system" });
    assert.deepEqual(readQwen(log), {
      calls: 2,
      input: 600,
      cacheRead: 2400,
      cacheWrite: 0,
      output: 120,
      reasoning: 30,
      costUsd: null,
    });
  });
});

describe("readGrok", () => {
  it("reads the session totals and converts cost ticks to dollars", () => {
    const json = JSON.stringify({
      session: {
        inputTokens: 1000,
        outputTokens: 50,
        cachedReadTokens: 800,
        cacheCreationTokens: 5,
        reasoningTokens: 20,
        totalTokens: 1050,
        modelCalls: 7,
        costUsdTicks: 6_871_128_000,
      },
    });
    assert.deepEqual(readGrok(json), {
      calls: 7,
      input: 200,
      cacheRead: 800,
      cacheWrite: 5,
      output: 50,
      reasoning: 20,
      costUsd: 0.6871128,
    });
  });
});

describe("readAntigravity", () => {
  const generation = (fields: Record<number, number>) =>
    encodeMessage({ 1: { 3: 1016, 4: fields }, 19: "gemini-pro-default" });

  it("decodes the usage block of every generation", () => {
    const rows = [generation({ 1: 1016, 2: 12961, 3: 232, 9: 171, 10: 61 }), generation({ 2: 2540, 3: 217, 5: 12148, 9: 145 })];
    assert.deepEqual(readAntigravity(rows), {
      calls: 2,
      input: 15501,
      cacheRead: 12148,
      cacheWrite: 0,
      output: 449,
      reasoning: 316,
      costUsd: null,
    });
  });

  it("rejects a generation without a usage block", () => {
    assert.throws(() => readAntigravity([encodeMessage({ 19: "x" })]), /usage/);
  });
});
