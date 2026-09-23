/**
 * One reader per harness log format. Each takes the raw log content and returns
 * normalised `Usage` (see usage.ts for what every field means). Readers are
 * pure; file access lives in scripts/tokens.ts.
 */
import { protoFields, protoMessage, protoVarint } from "./protobuf.ts";
import { addUsage, NO_USAGE, type Usage } from "./usage.ts";

/** Restricts a pi session to part of it: `from` inclusive, `to` exclusive, one model. */
export interface Window {
  readonly from?: string;
  readonly to?: string;
  readonly model?: string;
}

type Json = Record<string, unknown>;

function parseLines(text: string): Json[] {
  const rows: Json[] = [];
  text.split("\n").forEach((line, index) => {
    if (line.trim() === "") return;
    try {
      rows.push(JSON.parse(line) as Json);
    } catch (error) {
      throw new Error(`invalid JSON on line ${index + 1}: ${(error as Error).message}`);
    }
  });
  return rows;
}

const obj = (value: unknown): Json => (value !== null && typeof value === "object" ? (value as Json) : {});
const num = (value: unknown): number => (typeof value === "number" ? value : 0);
const optNum = (value: unknown): number | null => (typeof value === "number" ? value : null);

function call(fields: Omit<Usage, "calls">): Usage {
  return { calls: 1, ...fields };
}

const sum = (usages: Iterable<Usage>): Usage => [...usages].reduce(addUsage, NO_USAGE);

function inWindow(timestamp: unknown, window: Window): boolean {
  const t = Date.parse(String(timestamp));
  if (Number.isNaN(t)) throw new Error(`unparseable timestamp ${String(timestamp)}`);
  if (window.from !== undefined && t < Date.parse(window.from)) return false;
  if (window.to !== undefined && t >= Date.parse(window.to)) return false;
  return true;
}

/** pi: every assistant message carries its own usage and cost. */
export function readPi(text: string, window: Window = {}): Usage {
  const calls = parseLines(text)
    .filter((row) => row.type === "message" && obj(row.message).role === "assistant")
    .filter((row) => window.model === undefined || obj(row.message).model === window.model)
    .filter((row) => inWindow(row.timestamp, window))
    .map((row) => {
      const u = obj(obj(row.message).usage);
      return call({
        input: num(u.input),
        cacheRead: num(u.cacheRead),
        cacheWrite: num(u.cacheWrite),
        output: num(u.output),
        reasoning: optNum(u.reasoning),
        costUsd: optNum(obj(u.cost).total),
      });
    });
  return sum(calls);
}

/** Claude Code: one line per content block, so a message's usage repeats; keep the last copy. */
export function readClaudeCode(text: string): Usage {
  const byMessage = new Map<string, Usage>();
  for (const row of parseLines(text)) {
    if (row.type !== "assistant") continue;
    const message = obj(row.message);
    if (message.model === "<synthetic>") continue;
    const u = obj(message.usage);
    byMessage.set(
      String(message.id),
      call({
        input: num(u.input_tokens),
        cacheRead: num(u.cache_read_input_tokens),
        cacheWrite: num(u.cache_creation_input_tokens),
        output: num(u.output_tokens),
        reasoning: null,
        costUsd: null,
      }),
    );
  }
  return sum(byMessage.values());
}

/** Codex: `token_count` events carry cumulative totals; input includes the cached share. */
export function readCodex(text: string): Usage {
  let last: Json | null = null;
  let calls = 0;
  for (const row of parseLines(text)) {
    const payload = obj(row.payload);
    if (row.type !== "event_msg" || payload.type !== "token_count" || payload.info == null) continue;
    const total = obj(obj(payload.info).total_token_usage);
    if (last === null || num(total.total_tokens) > num(last.total_tokens)) calls++;
    last = total;
  }
  if (last === null) return NO_USAGE;
  return {
    calls,
    input: num(last.input_tokens) - num(last.cached_input_tokens),
    cacheRead: num(last.cached_input_tokens),
    cacheWrite: 0,
    output: num(last.output_tokens),
    reasoning: num(last.reasoning_output_tokens),
    costUsd: null,
  };
}

/** Gemini CLI: input includes the cached share, output excludes thoughts; messages may be rewritten. */
export function readGeminiCli(text: string): Usage {
  const byMessage = new Map<string, Usage>();
  for (const row of parseLines(text)) {
    if (row.type !== "gemini" || row.tokens == null) continue;
    const t = obj(row.tokens);
    byMessage.set(
      String(row.id),
      call({
        input: num(t.input) + num(t.tool) - num(t.cached),
        cacheRead: num(t.cached),
        cacheWrite: 0,
        output: num(t.output) + num(t.thoughts),
        reasoning: num(t.thoughts),
        costUsd: null,
      }),
    );
  }
  return sum(byMessage.values());
}

/** Qwen Code: total = prompt + candidates, so candidates already include the thoughts. */
export function readQwen(text: string): Usage {
  const byMessage = new Map<string, Usage>();
  for (const row of parseLines(text)) {
    if (row.usageMetadata == null) continue;
    const u = obj(row.usageMetadata);
    byMessage.set(
      String(row.uuid),
      call({
        input: num(u.promptTokenCount) - num(u.cachedContentTokenCount),
        cacheRead: num(u.cachedContentTokenCount),
        cacheWrite: 0,
        output: num(u.candidatesTokenCount),
        reasoning: num(u.thoughtsTokenCount),
        costUsd: null,
      }),
    );
  }
  return sum(byMessage.values());
}

/** Grok CLI `usage.json`: session totals; input includes the cached share, cost is in 1e-10 USD ticks. */
export function readGrok(text: string): Usage {
  const s = obj(obj(JSON.parse(text)).session);
  return {
    calls: num(s.modelCalls),
    input: num(s.inputTokens) - num(s.cachedReadTokens),
    cacheRead: num(s.cachedReadTokens),
    cacheWrite: num(s.cacheCreationTokens),
    output: num(s.outputTokens),
    reasoning: optNum(s.reasoningTokens),
    costUsd: typeof s.costUsdTicks === "number" ? s.costUsdTicks / 1e10 : null,
  };
}

/**
 * Antigravity: each `gen_metadata` row is a protobuf with the generation's usage
 * at field 1 -> 4. Fields: 2 uncached input, 3 output (thinking + response),
 * 5 cache read, 9 thinking. There is no published schema; the mapping was
 * inferred from the logs (3 always equals 9 + 10, the response share).
 */
export function readAntigravity(generations: readonly Uint8Array[]): Usage {
  return sum(
    generations.map((blob, index) => {
      const usage = protoMessage(protoMessage(protoFields(blob), 1) ?? new Map(), 4);
      if (!usage) throw new Error(`antigravity generation ${index} has no usage block`);
      return call({
        input: protoVarint(usage, 2),
        cacheRead: protoVarint(usage, 5),
        cacheWrite: 0,
        output: protoVarint(usage, 3),
        reasoning: protoVarint(usage, 9),
        costUsd: null,
      });
    }),
  );
}
