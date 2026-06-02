/**
 * Real-world usage examples for the recursive utility types.
 *
 * Each example is self-contained and type-checks under
 * `tsgo --noEmit --strict`. Run with `npx tsx examples.ts` to see the
 * (intentionally small) runtime output.
 */

import type {
  DeepReadonly,
  DeepMutable,
  DeepPartial,
  DeepRequired,
  DeepPick,
} from "./types.ts";

/* ------------------------------------------------------------------ *
 * Example 1 — Immutable Redux-style application state
 *
 * The store is handed out as DeepReadonly so reducers cannot mutate it
 * in place; new state is produced immutably. A scoped DeepMutable "draft"
 * is used internally to build the next state.
 * ------------------------------------------------------------------ */

interface AppState {
  user: {
    id: string;
    profile: { name: string; roles: string[] };
  };
  cart: {
    items: { sku: string; qty: number }[];
    coupons: Set<string>;
  };
}

type ReadonlyState = DeepReadonly<AppState>;

const initialState: ReadonlyState = {
  user: { id: "u1", profile: { name: "Ada", roles: ["admin"] } },
  cart: { items: [{ sku: "abc", qty: 2 }], coupons: new Set(["WELCOME"]) },
};

// A reducer receives readonly state and returns brand-new readonly state.
function addCartItem(
  state: ReadonlyState,
  item: { sku: string; qty: number },
): ReadonlyState {
  const draft: DeepMutable<ReadonlyState> = {
    user: {
      id: state.user.id,
      profile: {
        name: state.user.profile.name,
        roles: [...state.user.profile.roles],
      },
    },
    cart: {
      items: [...state.cart.items, item],
      coupons: new Set(state.cart.coupons),
    },
  };
  return draft;
}

const nextState = addCartItem(initialState, { sku: "xyz", qty: 1 });

/* ------------------------------------------------------------------ *
 * Example 2 — Config with overridable defaults
 *
 * A full, validated config is `Required`; user-supplied overrides are a
 * DeepPartial so callers only specify what they want to change.
 * ------------------------------------------------------------------ */

interface ServerConfig {
  http: { host: string; port: number; tls: { enabled: boolean; cert?: string } };
  logging: { level: "debug" | "info" | "warn" | "error"; pretty: boolean };
}

type ConfigOverrides = DeepPartial<ServerConfig>;
type ResolvedConfig = DeepRequired<ServerConfig>;

const defaults: ResolvedConfig = {
  http: { host: "0.0.0.0", port: 8080, tls: { enabled: false, cert: "" } },
  logging: { level: "info", pretty: false },
};

function resolveConfig(overrides: ConfigOverrides): ResolvedConfig {
  return {
    http: {
      host: overrides.http?.host ?? defaults.http.host,
      port: overrides.http?.port ?? defaults.http.port,
      tls: {
        enabled: overrides.http?.tls?.enabled ?? defaults.http.tls.enabled,
        cert: overrides.http?.tls?.cert ?? defaults.http.tls.cert,
      },
    },
    logging: {
      level: overrides.logging?.level ?? defaults.logging.level,
      pretty: overrides.logging?.pretty ?? defaults.logging.pretty,
    },
  };
}

const resolved = resolveConfig({ http: { port: 9090 } });

/* ------------------------------------------------------------------ *
 * Example 3 — API responses: frozen payloads + projected views
 *
 * Network payloads are DeepReadonly so consumers can never mutate cached
 * data. DeepPick extracts a narrow, strongly-typed projection for a list view.
 * ------------------------------------------------------------------ */

interface ApiUserResponse {
  data: {
    user: {
      id: string;
      name: string;
      address: { city: string; country: string };
      settings: { theme: "light" | "dark"; notifications: boolean };
    };
  };
  meta: { requestId: string; cachedAt: number };
}

type FrozenResponse = DeepReadonly<ApiUserResponse>;

// A list view only needs the id, name and city — picked by dot-path.
type UserListItem = DeepPick<
  ApiUserResponse,
  "data.user.id" | "data.user.name" | "data.user.address.city"
>;

function toListItem(res: FrozenResponse): UserListItem {
  return {
    data: {
      user: {
        id: res.data.user.id,
        name: res.data.user.name,
        address: { city: res.data.user.address.city },
      },
    },
  };
}

const apiResponse: FrozenResponse = {
  data: {
    user: {
      id: "42",
      name: "Grace",
      address: { city: "London", country: "UK" },
      settings: { theme: "dark", notifications: true },
    },
  },
  meta: { requestId: "req-1", cachedAt: Date.now() },
};

const listItem = toListItem(apiResponse);

/* ------------------------------------------------------------------ */

console.log("Example 1 — next cart size:", nextState.cart.items.length);
console.log("Example 2 — resolved port:", resolved.http.port);
console.log("Example 3 — list item city:", listItem.data.user.address.city);
