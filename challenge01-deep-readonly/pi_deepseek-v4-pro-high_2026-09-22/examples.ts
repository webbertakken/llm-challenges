/**
 * Real-world usage examples for the recursive utility types.
 *
 * These are pure type annotations (no runtime code); they compile alongside
 * `types.ts` and `tests.ts` as additional evidence of usability.
 */
import type { DeepReadonly, DeepMutable, DeepPartial, DeepRequired, DeepPick } from "./types.js";

// ---------------------------------------------------------------------------
// 1. Immutable Redux state
// ---------------------------------------------------------------------------
interface AppState {
  user: {
    profile: { name: string; email: string };
    preferences: Map<string, boolean>;
  };
  posts: Array<{ id: number; tags: string[] }>;
}

type ImmutableState = DeepReadonly<AppState>;

declare const state: ImmutableState;
const userName: string = state.user.profile.name;
const tags: readonly string[] = state.posts[0]!.tags;

// ---------------------------------------------------------------------------
// 2. Config objects: read-only to consumers, mutable to the loader
// ---------------------------------------------------------------------------
interface Config {
  server: { host: string; port: number };
  features: Set<string>;
}

type ReadonlyConfig = DeepReadonly<Config>;
type WritableConfig = DeepMutable<ReadonlyConfig>;

declare function loadConfig(): ReadonlyConfig;
declare function applyConfig(cfg: WritableConfig): void;

const loaded: ReadonlyConfig = loadConfig();
// applyConfig(loaded) would be a type error: re-materialise first via a cast in
// real code; here we simply document that DeepMutable<DeepReadonly<C>> === C.
const _roundTrip: Expect<Equal<WritableConfig, Config>> = true;

// ---------------------------------------------------------------------------
// 3. API response types: partial payloads during an upsert
// ---------------------------------------------------------------------------
interface ApiResponse {
  id: number;
  meta: { page: number; total: number };
  records: Array<{ name: string; details: { depth: number } }>;
}

type PartialUpdate = DeepPartial<ApiResponse>;
type FullUpdate = DeepRequired<PartialUpdate>;

type PartialRecord = DeepPick<ApiResponse, "id" | "meta.page">;
// => { id: number; meta: { page: number } }

// Re-export the tiny equality harness used above so `examples.ts` is
// self-contained.
type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;

export {};
