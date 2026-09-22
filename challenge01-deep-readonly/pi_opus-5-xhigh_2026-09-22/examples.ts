/**
 * Real-world usage examples. Runnable with `npx tsx examples.ts`.
 *
 *   1. Immutable Redux-style store  -> DeepReadonly / DeepMutable
 *   2. Layered configuration        -> DeepPartial / DeepRequired
 *   3. API response projections     -> DeepPick / DeepReadonly
 */

import type {
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types.js";

/* -------------------------------------------------------------------------- */
/* Example 1 — an immutable Redux-style store                                 */
/* -------------------------------------------------------------------------- */

interface AppState {
  user: { id: string; name: string; roles: string[] };
  cart: { items: Array<{ sku: string; qty: number }>; coupons: Set<string> };
  sessions: Map<string, { startedAt: number }>;
}

/** What consumers see: nothing can be written, at any depth. */
type ReadonlyState = DeepReadonly<AppState>;

/** What a reducer works on internally before publishing a new snapshot. */
type Draft = DeepMutable<ReadonlyState>;

type Action =
  | { type: "cart/add"; sku: string }
  | { type: "user/rename"; name: string };

function reduce(state: ReadonlyState, action: Action): ReadonlyState {
  const draft: Draft = structuredCloneish(state);
  switch (action.type) {
    case "cart/add": {
      const existing = draft.cart.items.find((i) => i.sku === action.sku);
      if (existing) existing.qty += 1;
      else draft.cart.items.push({ sku: action.sku, qty: 1 });
      break;
    }
    case "user/rename":
      draft.user.name = action.name;
      break;
  }
  return draft; // a mutable draft is always assignable to its readonly view
}

/** Structural clone that keeps Map/Set instances (and the Draft typing). */
function structuredCloneish(state: ReadonlyState): Draft {
  return {
    user: { ...state.user, roles: [...state.user.roles] },
    cart: {
      items: state.cart.items.map((i) => ({ ...i })),
      coupons: new Set(state.cart.coupons),
    },
    sessions: new Map([...state.sessions].map(([k, v]) => [k, { ...v }])),
  };
}

const initialState: ReadonlyState = {
  user: { id: "u1", name: "Ada", roles: ["admin"] },
  cart: { items: [], coupons: new Set(["WELCOME"]) },
  sessions: new Map([["s1", { startedAt: 0 }]]),
};

function renderCart(state: ReadonlyState): string {
  // Reading is unrestricted; writing would not compile:
  //   state.cart.items.push(...)   ->  Property 'push' does not exist
  return state.cart.items.map((i) => `${i.sku} x${i.qty}`).join(", ") || "(empty)";
}

/* -------------------------------------------------------------------------- */
/* Example 2 — layered configuration                                          */
/* -------------------------------------------------------------------------- */

interface ServerConfig {
  http: { host: string; port: number; cors?: { origins: string[] } };
  db: { url: string; pool: { min: number; max: number } };
  telemetry?: { enabled: boolean; sampleRate: number };
}

/** A fully resolved config: no optional fields survive. */
type ResolvedConfig = DeepRequired<ServerConfig>;

/** A user-supplied override file: everything optional, at every depth. */
type ConfigOverrides = DeepPartial<ServerConfig>;

const defaults: ResolvedConfig = {
  http: { host: "0.0.0.0", port: 8080, cors: { origins: ["*"] } },
  db: { url: "postgres://localhost/app", pool: { min: 1, max: 10 } },
  telemetry: { enabled: false, sampleRate: 0.1 },
};

const productionOverrides: ConfigOverrides = {
  http: { port: 443 },
  db: { pool: { max: 50 } },
  telemetry: { enabled: true },
};

function mergeConfig(
  base: ResolvedConfig,
  overrides: ConfigOverrides,
): ResolvedConfig {
  return deepMerge<ResolvedConfig>(base, overrides);
}

function deepMerge<T extends object>(base: T, patch: DeepPartial<T>): T {
  const out: T = { ...base };
  for (const key of Object.keys(patch) as Array<keyof T & string>) {
    const patchValue: unknown = (patch as Record<string, unknown>)[key];
    if (patchValue === undefined) continue;
    const baseValue: unknown = (base as Record<string, unknown>)[key];
    const mergeable =
      isPlainObject(baseValue) && isPlainObject(patchValue);
    (out as Record<string, unknown>)[key] = mergeable
      ? deepMerge(baseValue, patchValue as DeepPartial<typeof baseValue>)
      : patchValue;
  }
  return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Map) &&
    !(value instanceof Set) &&
    !(value instanceof Date)
  );
}

/* -------------------------------------------------------------------------- */
/* Example 3 — API response projections                                       */
/* -------------------------------------------------------------------------- */

interface UserResponse {
  data: {
    id: string;
    profile: { displayName: string; avatarUrl: string; bio: string };
    stats: { followers: number; following: number };
  };
  meta: { requestId: string; cachedAt: Date };
}

/** The list view only ever needs a name and a follower count. */
type UserListItem = DeepPick<
  UserResponse,
  "data.id" | "data.profile.displayName" | "data.stats.followers"
>;

/** Responses handed to view code are frozen so no view can corrupt the cache. */
type CachedUser = DeepReadonly<UserResponse>;

function toListItem(response: CachedUser): UserListItem {
  return {
    data: {
      id: response.data.id,
      profile: { displayName: response.data.profile.displayName },
      stats: { followers: response.data.stats.followers },
    },
  };
}

const cached: CachedUser = {
  data: {
    id: "u1",
    profile: { displayName: "Ada", avatarUrl: "/a.png", bio: "Engineer" },
    stats: { followers: 42, following: 7 },
  },
  meta: { requestId: "r1", cachedAt: new Date(0) },
};

/* --------------------------------- output ---------------------------------- */

const nextState = reduce(reduce(initialState, { type: "cart/add", sku: "abc" }), {
  type: "cart/add",
  sku: "abc",
});
const merged = mergeConfig(defaults, productionOverrides);
const listItem = toListItem(cached);

console.log("1. redux store   :", renderCart(nextState), "| user:", nextState.user.name);
console.log("2. merged config :", JSON.stringify(merged.http), JSON.stringify(merged.db.pool));
console.log("3. list item     :", JSON.stringify(listItem));

export type { ReadonlyState, Draft, ResolvedConfig, ConfigOverrides, UserListItem, CachedUser };
export { reduce, mergeConfig, toListItem, initialState, defaults, cached };
