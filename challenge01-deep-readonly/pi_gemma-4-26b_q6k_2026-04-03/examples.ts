import { DeepReadonly, DeepMutable, DeepPartial, DeepRequired, DeepPick } from './types';

// --- Example 1: Immutable Redux-like State ---
type AppState = {
  readonly user: {
    readonly id: string;
    readonly profile: {
      readonly name: string;
      readonly avatarUrl: string;
    };
  };
  readonly posts: { id: string; content: string }[];
};

type ImmutableState = DeepReadonly<AppState>;

// --- Example 2: Configuration Object ---
type Config = {
  api: {
    baseUrl: string;
    timeout: number;
    headers: Record<string, string>;
  };
  features: {
    darkMode: boolean;
    betaAccess: boolean;
  };
};

type PartialConfig = DeepPartial<Config>;

// --- Example 3: API Response with Maps and Sets ---
type ApiResponse = {
  data: Map<string, { id: number; tags: Set<string> }>;
  status: number;
};

type ReadonlyResponse = DeepReadonly<ApiResponse>;

// --- Example 4: DeepPick usage ---
type Original = {
  a: {
    b: {
      c: number;
    };
    d: string;
  };
};

// Note: My current DeepPick implementation is limited.
// For a single path "a.b.c":
type PickedSingle = DeepPick<Original, "a.b.c">;