/**
 * Which harness logs belong to which run. Paths are relative to the home
 * directory of the machine that ran the benchmark; the logs never leave it,
 * only the derived TOKENS.md is committed.
 *
 * A run counts the sessions that produced its committed deliverables. Where a
 * harness wrote a duration marker, the counted session is the one whose elapsed
 * time matches it. Earlier or aborted attempts are listed in NOT_COUNTED so
 * their spend stays visible.
 */
import type { Window } from "./readers.ts";

export type Reader = "pi" | "claude-code" | "codex" | "gemini-cli" | "qwen" | "grok" | "antigravity";

export interface Source {
  readonly reader: Reader;
  readonly path: string;
  /** pi only: count part of an interactive session. */
  readonly window?: Window;
}

export interface RunSources {
  readonly run: string;
  readonly sources: readonly Source[];
  readonly note?: string;
}

export interface NotCounted {
  readonly run: string;
  readonly source: Source;
  readonly reason: string;
}

export interface Unavailable {
  readonly run: string;
  readonly reason: string;
}

const PI = ".pi/agent/sessions";
const PI_MAIN = `${PI}/--home-webber-Repositories-llm-challenges--`;
const PI_HOME = `${PI}/--home-webber--`;
const piWt = (slug: string, file: string): Source => ({
  reader: "pi",
  path: `${PI}/--home-webber-Repositories-llm-challenges-wt-${slug}--/${file}.jsonl`,
});
const pi = (dir: string, file: string, window?: Window): Source => ({
  reader: "pi",
  path: `${dir}/${file}.jsonl`,
  ...(window ? { window } : {}),
});
const grok = (slug: string, id: string): Source => ({
  reader: "grok",
  path: `.grok/sessions/%2Fhome%2Fwebber%2FRepositories%2Fllm-challenges-wt%2F${slug}/${id}/usage.json`,
});
const antigravity = (id: string): Source => ({
  reader: "antigravity",
  path: `.gemini/antigravity-cli/conversations/${id}.db`,
});
const claude = (project: string, id: string): Source => ({
  reader: "claude-code",
  path: `.claude/projects/${project}/${id}.jsonl`,
});
const codex = (file: string): Source => ({
  reader: "codex",
  path: `.codex/sessions/2026/06/02/rollout-2026-06-02T${file}.jsonl`,
});
const gemini = (file: string): Source => ({
  reader: "gemini-cli",
  path: `.gemini/tmp/repo/chats/session-2026-06-02T${file}.jsonl`,
});
const qwen = (id: string): Source => ({
  reader: "qwen",
  path: `.qwen/projects/-home-webber-Repositories-llm-challenges/chats/${id}.jsonl`,
});
const claudeBench = (challenge: string, id: string): Source =>
  claude(`-tmp-bench-claude-opus-4-8-${challenge}`, id);

export const RUNS: readonly RunSources[] = [
  // 2026-09-22: one session per run covering all seven challenges.
  { run: "antigravity/gemini-3.1-pro-high/2026-09-22", sources: [antigravity("ab99d2fd-b6ad-4a2f-b23f-dd738e986f09")] },
  { run: "antigravity/gemini-3.7-flash-high/2026-09-22", sources: [antigravity("a21b3728-ca97-4472-9d0a-84558e23632d")] },
  { run: "antigravity/gemini-3.8-flash-high/2026-09-22", sources: [antigravity("1b3e6e2b-d82d-4bba-9350-d8178cf129b7")] },
  { run: "grok/grok-4.6-high/2026-09-22", sources: [grok("grok-4.6-high", "5157b0be-cd7b-4ebe-89c2-4c790842fc26")] },
  { run: "grok/grok-4.6-xhigh/2026-09-22", sources: [grok("grok-4.6-xhigh", "d0b9e684-2290-43a2-b99a-97c49bf342d5")] },
  { run: "grok/grok-4.7-high/2026-09-22", sources: [grok("grok-4.7-high", "6696ab31-aa57-49ef-a1fa-65ee55935b56")] },
  { run: "grok/grok-4.7-xhigh/2026-09-22", sources: [grok("grok-4.7-xhigh", "0de1f228-bb82-4bd4-aa75-4e0861823f55")] },
  {
    run: "pi/deepseek-v4-flash-high/2026-09-22",
    sources: [piWt("deepseek-v4-flash-high", "2026-09-22T18-59-01-100Z_01a0ca7c-556c-7228-ae5c-74c1e0bd42b4")],
  },
  {
    run: "pi/deepseek-v4-pro-high/2026-09-22",
    sources: [piWt("deepseek-v4-pro-high", "2026-09-22T18-59-01-083Z_01a0ca7c-555b-7228-ae5c-74bed219a258")],
  },
  {
    run: "pi/fable-5.1-xhigh/2026-09-22",
    sources: [piWt("fable-5.1-xhigh", "2026-09-22T18-59-01-063Z_01a0ca7c-5547-7228-ae5c-74bc5cdb8a2e")],
  },
  { run: "pi/opus-5-high/2026-09-22", sources: [piWt("opus-5-high", "2026-09-22T16-50-32-465Z_01a0ca06-b591-7228-ae5c-74b9a23127cf")] },
  { run: "pi/opus-5-xhigh/2026-09-22", sources: [piWt("opus-5-xhigh", "2026-09-22T16-50-32-486Z_01a0ca06-b5a6-7228-ae5c-74ba23c9ddab")] },
  { run: "pi/opus-5.5-high/2026-09-22", sources: [piWt("opus-5.5-high", "2026-09-22T20-21-57-165Z_01a0cac8-432d-72b6-ba70-394da7e60ae0")] },
  {
    run: "pi/opus-5.5-medium/2026-09-22",
    sources: [piWt("opus-5.5-medium", "2026-09-22T20-24-10-532Z_01a0caca-4c24-72b6-ba70-3952579a1190")],
  },
  { run: "pi/opus-5.5-xhigh/2026-09-22", sources: [piWt("opus-5.5-xhigh", "2026-09-22T20-21-57-189Z_01a0cac8-4345-72b6-ba70-394ee7eaa306")] },

  // 2026-06-02/03: one session per challenge (pi opus: one session for 01-03).
  {
    run: "claude/opus-4.8/2026-06-03",
    sources: [
      claudeBench("challenge01-deep-readonly", "b04a0854-3df2-4153-bf24-c31b6e2d68ec"),
      claudeBench("challenge02-solar-system", "fac890d8-8fc2-4524-b4bf-6fd60540e56c"),
      claudeBench("challenge03-repo-overview-plantuml", "04112733-9c7f-4d04-b980-7c14ce1d4c75"),
      claudeBench("challenge04-bug-hunt", "f1e99cee-63bd-4fb9-8f9a-dae1e6985028"),
      claudeBench("challenge05-reverse-engineer", "f34558a2-6697-4973-8c33-40443a7f4929"),
      claudeBench("challenge06-type-eval", "d4cad4a8-f50c-492e-ac76-5b7096c4792f"),
      claudeBench("challenge07-type-lambda", "bf0559ed-74e3-4f8d-876f-71645e600046"),
    ],
  },
  {
    run: "codex/gpt-5.5/2026-06-02",
    sources: [
      codex("16-07-35-019e88a9-4651-73b0-8465-9262bbc69256"),
      codex("16-10-51-019e88ac-4570-7dd3-85cf-a242d13a8f9f"),
      codex("16-13-27-019e88ae-a49d-79d1-bc5d-3630cc01b8ab"),
      codex("16-16-38-019e88b1-8e71-7e42-9152-f3598dcc8138"),
      codex("16-19-41-019e88b4-5bdf-7020-8f47-e8cb7d1b7230"),
      codex("16-20-52-019e88b5-6ede-7022-9741-b8f4e159500f"),
      codex("16-23-36-019e88b7-ee83-7903-b111-efabc0e9b599"),
    ],
  },
  {
    run: "codex/gpt-5.4/2026-06-02",
    sources: [
      codex("16-27-18-019e88bb-5376-72e2-83b0-6a70ac3bf192"),
      codex("16-31-11-019e88be-e266-71b2-8d2d-08e42b1ee8e2"),
      codex("16-34-20-019e88c1-c3f4-70d2-8130-33d70a3f4448"),
    ],
    note: "ch03 and ch05-07 hit the quota before a first response",
  },
  {
    run: "gemini/gemini-2.5-pro/2026-06-02",
    sources: [
      gemini("12-15-6260cecc"),
      gemini("12-20-7259a2e6"),
      gemini("12-21-87726570"),
      gemini("12-22-d7e2cac1"),
      gemini("12-25-36007fe5"),
    ],
    note: "ch06-07 hit the quota before a first response",
  },
  {
    run: "gemini/gemini-3.1-pro-preview/2026-06-02",
    sources: [
      gemini("11-47-a18218f8"),
      gemini("11-50-a79ede0a"),
      gemini("11-51-4fad0196"),
      gemini("11-52-e4b7ee91"),
      gemini("11-54-d4b7e81c"),
      gemini("11-56-cc04caf4"),
      gemini("12-01-1b412985"),
    ],
  },
  {
    run: "gemini/gemini-3-flash-preview/2026-06-02",
    sources: [
      gemini("12-30-4af64b06"),
      gemini("12-08-561b44b2"),
      gemini("12-08-9360ec2a"),
      gemini("12-09-7ad0449d"),
      gemini("12-09-e4ab87c8"),
      gemini("12-10-1c51d031"),
      gemini("12-13-beea0217"),
    ],
  },
  {
    run: "pi/deltacoder-9b-q8/2026-06-02",
    sources: [
      pi(PI_MAIN, "2026-06-02T11-37-00-443Z_019e881f-691b-79be-bfc8-10934b8f4c22"),
      pi(PI_MAIN, "2026-06-02T11-43-31-115Z_019e8825-5f2b-7f6a-aeb7-a8bf140cb654"),
      pi(PI_MAIN, "2026-06-02T11-46-20-986Z_019e8827-f6ba-73c5-a096-400713660ddb"),
      pi(PI_MAIN, "2026-06-02T11-48-39-678Z_019e882a-147e-7ddd-95fb-eb72e150fd4d"),
      pi(PI_MAIN, "2026-06-02T11-57-30-465Z_019e8832-2de1-7f39-aa34-347ff0162512"),
      pi(PI_MAIN, "2026-06-02T12-01-24-029Z_019e8835-be3d-78a8-b6ae-d272aa8c0356"),
      pi(PI_MAIN, "2026-06-02T12-05-09-892Z_019e8839-3084-7b83-ad3b-63bb2862c871"),
    ],
  },
  {
    run: "pi/gemma-4-26b-q6k/2026-06-02",
    sources: [
      pi(PI_MAIN, "2026-06-02T12-22-37-255Z_019e8849-2bc7-77d5-8611-d3cb30e750a4"),
      pi(PI_MAIN, "2026-06-02T12-37-37-256Z_019e8856-e768-7d27-8658-c686980236cf"),
      pi(PI_MAIN, "2026-06-02T12-51-55-936Z_019e8864-01a0-7f24-a0ca-651ebdc84fa0"),
      pi(PI_MAIN, "2026-06-02T12-58-33-013Z_019e886a-10b5-7554-8094-27339641ba17"),
      pi(PI_MAIN, "2026-06-02T13-07-28-900Z_019e8872-3e04-7319-a0c0-ed5e877a4d01"),
      pi(PI_MAIN, "2026-06-02T13-13-27-694Z_019e8877-b78e-7499-bdd0-c291d9e7ee92"),
      pi(PI_MAIN, "2026-06-02T13-28-27-742Z_019e8885-735e-72fa-8068-2efdf94a0567"),
    ],
  },
  { run: "pi/opus-4.7-high/2026-06-02", sources: [pi(PI_MAIN, "2026-06-02T00-14-42-641Z_019e85ae-bfd1-7e32-bdd4-caf0f8cf3635")] },
  { run: "pi/opus-4.8-high/2026-06-02", sources: [pi(PI_MAIN, "2026-06-02T00-14-42-745Z_019e85ae-c039-744a-b673-c2554e5f6310")] },
  { run: "pi/opus-4.8-xhigh/2026-06-02", sources: [pi(PI_MAIN, "2026-06-02T00-14-42-896Z_019e85ae-c0d0-7367-bad5-377be8a5d6ff")] },

  // 2026-04-03: interactive sessions; windows cut out the repo-authoring chatter around each challenge.
  { run: "claude/opus-4.6/2026-04-03", sources: [claude("-home-webber", "7e13811b-bb4b-415e-89bd-5054fb83da27")] },
  { run: "qwen/qwen3.5-coder/2026-04-03", sources: [qwen("bd040d21-4652-4418-ac9a-f5928b4f6a06")] },
  {
    run: "pi/opus-4.6/2026-04-03",
    sources: [
      pi(PI_HOME, "2026-04-03T14-52-19-881Z_8b414f2c-f672-467b-bec9-be0610b182b9", {
        from: "2026-04-03T14:57:43.451Z",
        to: "2026-04-03T15:01:25.840Z",
      }),
      pi(PI_HOME, "2026-04-03T15-42-59-177Z_53123758-b566-412f-913b-d4dd61edd394", {
        from: "2026-04-03T15:43:17.782Z",
        to: "2026-04-03T15:44:22.121Z",
      }),
    ],
    note: "ch01-02 and ch03 prompts up to the next unrelated prompt",
  },
  {
    run: "pi/gemma-4-26b-q6k/2026-04-03",
    sources: [
      pi(PI_HOME, "2026-04-03T18-10-23-728Z_97e8d7db-bb89-4d58-bf65-338644b28143"),
      pi(PI_HOME, "2026-04-03T17-58-38-499Z_2d0909f7-8b6d-4b5c-9e36-921af581e2d0", {
        to: "2026-04-03T18:02:00.650Z",
      }),
      pi(PI_HOME, "2026-04-03T18-22-24-936Z_06b89279-13b2-4cbe-baa5-4ae05d44330b"),
    ],
    note: "ch02 up to its folder fix; the instruction edits after it are left out",
  },
  {
    run: "pi/deltacoder-9b-q8/2026-04-03",
    sources: [
      pi(PI_MAIN, "2026-04-03T19-03-08-211Z_c04ef1ef-4223-4528-9980-0595fcfef228"),
      pi(PI_MAIN, "2026-04-03T19-11-44-721Z_4210f6e0-e312-4faf-805d-a542d5a2dc5a", { model: "deltacoder-9b-q8" }),
    ],
    note: "second session only until it switched to Opus",
  },
];

export const NOT_COUNTED: readonly NotCounted[] = [
  {
    run: "antigravity/gemini-3.7-flash-high/2026-09-22",
    source: antigravity("bd3ccfab-7ce9-4d4f-8f79-5a8a2ab77f65"),
    reason: "first attempt escaped its worktree; discarded and re-run in a clone",
  },
  {
    run: "antigravity/gemini-3.8-flash-high/2026-09-22",
    source: antigravity("695deb99-4849-4427-93e9-0a99afc7807a"),
    reason: "first attempt escaped its worktree; discarded and re-run in a clone",
  },
  {
    run: "antigravity/gemini-3.1-pro-high/2026-09-22",
    source: antigravity("a0cd21f9-26a1-4da8-9bc0-5b5548732996"),
    reason: "first attempt stopped to ask for input; restarted",
  },
  {
    run: "pi/opus-5.5-high/2026-09-22",
    source: piWt("opus-5.5-high", "2026-09-22T19-54-08-301Z_01a0caae-cc2d-7228-ae5c-74c52fcb273d"),
    reason: "started on Opus 5 instead of 5.5; aborted",
  },
  {
    run: "pi/opus-5.5-medium/2026-09-22",
    source: piWt("opus-5.5-medium", "2026-09-22T20-21-57-212Z_01a0cac8-435c-72b6-ba70-3950a89003c6"),
    reason: "aborted during a harness restart",
  },
  {
    run: "pi/deltacoder-9b-q8/2026-06-02",
    source: pi(PI_MAIN, "2026-06-02T11-28-47-724Z_019e8817-e46c-7239-a5c3-e7780001b6e4"),
    reason: "all-in-one attempt wrote to the wrong folder; replaced by one session per challenge",
  },
  ...(
    [
      ["14-01-12-019e8835-9050-79f0-a918-1d1399b2717b", "ch02"],
      ["14-15-35-019e8842-bcde-7113-9d1c-2b3c1c1de08f", "ch03"],
      ["14-38-51-019e8858-0994-77c1-8bb4-f46ab0893a97", "ch03"],
      ["14-53-33-019e8865-7eb2-78e1-9f10-021d75cf093b", "ch02"],
      ["15-13-33-019e8877-ce97-7281-a0e1-09b458c9bdf8", "ch03"],
      ["16-07-35-019e88a9-44f0-7663-aa41-6210631ebf09", "ch06"],
    ] as const
  ).map(([file, challenge]) => ({
    run: "codex/gpt-5.5/2026-06-02",
    source: codex(file),
    reason: `earlier ${challenge} attempt; its duration marker was replaced by the re-run's`,
  })),
  {
    run: "gemini/gemini-3-flash-preview/2026-06-02",
    source: gemini("11-46-1bea4df0"),
    reason: "earlier ch02 attempt; its duration marker was replaced by the re-run's",
  },
  {
    run: "gemini/gemini-3-flash-preview/2026-06-02",
    source: gemini("12-07-adc80f6a"),
    reason: "earlier ch01 attempt; its duration marker was replaced by the re-run's",
  },
  {
    run: "qwen/qwen3.5-coder/2026-04-03",
    source: qwen("5ffe66d8-ad96-41f1-bd9b-92c5d6d6d72f"),
    reason: "first attempt, stopped after a minute and restarted with a folder hint",
  },
  {
    run: "pi/gemma-4-26b-q6k/2026-04-03",
    source: pi(PI_HOME, "2026-04-03T17-43-06-608Z_080ae5c9-884d-4173-9d47-1637ebdbcc25"),
    reason: "earlier ch01-02 attempt in wrongly named folders; redone",
  },
  {
    run: "pi/gemma-4-26b-q6k/2026-04-03",
    source: pi(PI_HOME, "2026-04-03T18-06-24-354Z_4cd5683b-b79c-4108-8d34-d83eab374f90"),
    reason: "earlier ch03 attempt in a wrongly named folder; redone",
  },
];

export const UNAVAILABLE: readonly Unavailable[] = [
  {
    run: "opencode/gemma-4-26b-q8_0/2026-04-03",
    reason: "run by a contributor on another machine; no log survives",
  },
];
