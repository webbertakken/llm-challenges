/**
 * Token usage normalised across harnesses. Every harness counts differently;
 * the readers map each one onto these fields:
 *
 * - `input`      prompt tokens billed at the full rate (not served from cache)
 * - `cacheRead`  prompt tokens served from the provider's prompt cache
 * - `cacheWrite` prompt tokens written to the cache (Anthropic only)
 * - `output`     generated tokens, reasoning included
 * - `reasoning`  the reasoning share of `output`, when the harness reports it
 * - `costUsd`    what the harness itself logged, when it logs a cost
 */
export interface Usage {
  readonly calls: number;
  readonly input: number;
  readonly cacheRead: number;
  readonly cacheWrite: number;
  readonly output: number;
  readonly reasoning: number | null;
  readonly costUsd: number | null;
}

export const NO_USAGE: Usage = {
  calls: 0,
  input: 0,
  cacheRead: 0,
  cacheWrite: 0,
  output: 0,
  reasoning: null,
  costUsd: null,
};

const addKnown = (a: number | null, b: number | null): number | null =>
  a === null && b === null ? null : (a ?? 0) + (b ?? 0);

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    calls: a.calls + b.calls,
    input: a.input + b.input,
    cacheRead: a.cacheRead + b.cacheRead,
    cacheWrite: a.cacheWrite + b.cacheWrite,
    output: a.output + b.output,
    reasoning: addKnown(a.reasoning, b.reasoning),
    costUsd: addKnown(a.costUsd, b.costUsd),
  };
}

/** Every token the model processed or produced. */
export const totalTokens = (u: Usage): number => u.input + u.cacheRead + u.cacheWrite + u.output;
