// Challenge 01 — Real-world usage examples

import type { DeepReadonly, DeepMutable, DeepPartial, DeepRequired, DeepPick } from "./types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// Example 1: Immutable Redux-style State
// ═══════════════════════════════════════════════════════════════════════════════

interface AppState {
  user: {
    id: number;
    name: string;
    preferences: {
      theme: "light" | "dark";
      notifications: boolean;
      favorites: string[];
    };
  };
  posts: {
    byId: Map<number, { title: string; body: string; tags: string[] }>;
    allIds: number[];
  };
}

// The store holds deeply frozen state — nothing can be accidentally mutated
type ImmutableState = DeepReadonly<AppState>;

function reducer(state: ImmutableState, action: { type: string }): ImmutableState {
  switch (action.type) {
    case "TOGGLE_THEME": {
      // Must create new objects at every level — TypeScript enforces this
      return {
        ...state,
        user: {
          ...state.user,
          preferences: {
            ...state.user.preferences,
            theme: state.user.preferences.theme === "light" ? "dark" : "light",
          },
        },
      };
    }
    default:
      return state;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Example 2: API Response Types & Partial Updates (PATCH)
// ═══════════════════════════════════════════════════════════════════════════════

interface UserProfile {
  id: number;
  email: string;
  displayName: string;
  address: {
    street: string;
    city: string;
    country: string;
    zip: string;
  };
  settings: {
    twoFactor: boolean;
    language: string;
    emailNotifications: {
      marketing: boolean;
      transactional: boolean;
      digest: boolean;
    };
  };
}

// GET /api/users/:id — returns the full, immutable profile
type GetUserResponse = DeepReadonly<UserProfile>;

// PATCH /api/users/:id — accepts any subset of nested fields
type PatchUserBody = DeepPartial<UserProfile>;

function updateUser(id: number, patch: PatchUserBody): void {
  // Can send a partial update at any nesting level
  updateUser(1, {
    address: { city: "Berlin" },
    settings: { emailNotifications: { marketing: false } },
  });
}

// For internal validation, ensure the full object is present
type ValidatedProfile = DeepRequired<PatchUserBody>;

// ═══════════════════════════════════════════════════════════════════════════════
// Example 3: Config Objects with DeepPick for Scoped Access
// ═══════════════════════════════════════════════════════════════════════════════

interface AppConfig {
  server: {
    host: string;
    port: number;
    tls: {
      enabled: boolean;
      certPath: string;
      keyPath: string;
    };
  };
  database: {
    host: string;
    port: number;
    name: string;
    pool: {
      min: number;
      max: number;
    };
  };
  logging: {
    level: "debug" | "info" | "warn" | "error";
    transports: string[];
  };
}

// Different modules only see the config they need
type ServerTlsConfig = DeepPick<AppConfig, "server.tls">;
type DatabasePoolConfig = DeepPick<AppConfig, "database.pool" | "database.host" | "database.port">;

function initConnectionPool(config: DatabasePoolConfig): void {
  const { host, port, pool } = config.database;
  console.log(`Connecting to ${host}:${port} with pool [${pool.min}, ${pool.max}]`);
}

// The TLS module can't accidentally read database config
function initTls(config: ServerTlsConfig): void {
  if (config.server.tls.enabled) {
    console.log(`Loading cert from ${config.server.tls.certPath}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Example 4 (bonus): Thawing frozen library data for local mutation
// ═══════════════════════════════════════════════════════════════════════════════

// A library returns deeply frozen data
declare function fetchCatalog(): DeepReadonly<{
  items: { id: number; name: string; tags: Set<string> }[];
  index: Map<string, number[]>;
}>;

// We need a mutable working copy for local transformations
function processLocally() {
  const frozen = fetchCatalog();

  // DeepMutable lets us declare the mutable shape
  type MutableCatalog = DeepMutable<typeof frozen>;

  // structuredClone + cast gives us a safe mutable copy
  const catalog = structuredClone(frozen) as unknown as MutableCatalog;
  catalog.items.push({ id: 99, name: "New Item", tags: new Set(["fresh"]) });
  catalog.index.set("fresh", [99]);
}
