/**
 * Real-world usage examples for the deep utility types.
 *
 * Each example is self-contained and type-checks cleanly. Run it with
 * `npx tsx examples.ts` to see the (small) runtime demonstrations.
 */

import type {
  DeepReadonly,
  DeepPartial,
  DeepRequired,
  DeepPick,
  DeepMutable,
} from "./types.js";

/* ========================================================================== */
/* Example 1: immutable Redux-style store state                               */
/* ========================================================================== */
/**
 * A reducer receives state it must never mutate. `DeepReadonly` freezes the
 * whole tree at the type level, so an accidental in-place write becomes a
 * compile error rather than a heisenbug.
 */

interface AppState {
  user: {
    id: string;
    profile: { name: string; roles: string[] };
  };
  session: {
    token: string | null;
    flags: Map<string, boolean>;
  };
  cart: { items: Array<{ sku: string; qty: number }>; total: number };
}

type ReadonlyState = DeepReadonly<AppState>;

function reducer(state: ReadonlyState): ReadonlyState {
  // Mutations are caught at compile time, e.g. all of these would error:
  //   state.cart.total = 0;
  //   state.cart.items.push({ sku: "x", qty: 1 });
  //   state.session.flags.set("beta", true);
  //
  // The only legal update is to build a new tree:
  return {
    ...state,
    cart: { ...state.cart, total: recompute(state.cart.items) },
  };
}

function recompute(items: ReadonlyArray<{ sku: string; qty: number }>): number {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

const initialState: ReadonlyState = {
  user: { id: "u1", profile: { name: "Ada", roles: ["admin"] } },
  session: { token: null, flags: new Map([["beta", true]]) },
  cart: { items: [{ sku: "book", qty: 2 }], total: 2 },
};

console.log("Example 1 - new cart total:", reducer(initialState).cart.total);

/* ========================================================================== */
/* Example 2: layered configuration (defaults + partial overrides)            */
/* ========================================================================== */
/**
 * A `DeepRequired` "resolved" config is produced by merging fully-specified
 * defaults with a `DeepPartial` override coming from a user file or env.
 */

interface ServerConfig {
  host: string;
  port: number;
  tls: { enabled: boolean; cert?: string; key?: string };
  logging: { level: "debug" | "info" | "warn" | "error"; pretty: boolean };
}

type ResolvedConfig = DeepRequired<ServerConfig>;
type ConfigOverrides = DeepPartial<ServerConfig>;

const defaults: ResolvedConfig = {
  host: "0.0.0.0",
  port: 8080,
  tls: { enabled: false, cert: "", key: "" },
  logging: { level: "info", pretty: false },
};

function resolveConfig(overrides: ConfigOverrides): ResolvedConfig {
  return {
    ...defaults,
    ...overrides,
    tls: { ...defaults.tls, ...overrides.tls },
    logging: { ...defaults.logging, ...overrides.logging },
  };
}

const resolved = resolveConfig({ port: 443, tls: { enabled: true } });
console.log(
  `Example 2 - resolved config: ${resolved.host}:${resolved.port} tls=${resolved.tls.enabled}`,
);

/* ========================================================================== */
/* Example 3: API responses - narrow a wide DTO with DeepPick                 */
/* ========================================================================== */
/**
 * A list view only needs a few deep fields of a large API payload. `DeepPick`
 * documents exactly which fields the view depends on, and `DeepMutable` turns
 * an immutable cache entry back into an editable draft.
 */

interface UserApiResponse {
  id: string;
  meta: { createdAt: string; updatedAt: string };
  profile: {
    displayName: string;
    avatarUrl: string;
    address: { city: string; country: string; postcode: string };
  };
  preferences: { theme: "light" | "dark"; newsletter: boolean };
}

type UserListItem = DeepPick<
  UserApiResponse,
  "id" | "profile.displayName" | "profile.address.city"
>;

function toListItem(user: UserApiResponse): UserListItem {
  return {
    id: user.id,
    profile: {
      displayName: user.profile.displayName,
      address: { city: user.profile.address.city },
    },
  };
}

const apiUser: UserApiResponse = {
  id: "u-42",
  meta: { createdAt: "2026-01-01", updatedAt: "2026-06-01" },
  profile: {
    displayName: "Grace H.",
    avatarUrl: "https://example.test/a.png",
    address: { city: "London", country: "UK", postcode: "EC1" },
  },
  preferences: { theme: "dark", newsletter: false },
};

const listItem = toListItem(apiUser);
console.log(
  `Example 3 - list item: ${listItem.id} / ${listItem.profile.displayName} / ${listItem.profile.address.city}`,
);

// A frozen cache value can be cloned into a mutable draft for editing.
type FrozenUser = DeepReadonly<UserApiResponse>;
type UserDraft = DeepMutable<FrozenUser>;

function editName(frozen: FrozenUser): UserDraft {
  const draft: UserDraft = structuredClone(frozen) as UserDraft;
  draft.profile.displayName = draft.profile.displayName.toUpperCase();
  return draft;
}

const draft = editName(apiUser);
console.log("Example 3 - edited draft name:", draft.profile.displayName);
