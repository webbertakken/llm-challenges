/**
 * Real-world usage examples for the deep-utility types.
 *
 * Each example is independent and demonstrates how the type behaves on a
 * shape that you would actually encounter in production code:
 *
 *   1. Immutable Redux-style application state.
 *   2. Config objects with optional sections (for layered defaults).
 *   3. API response types that need a "fully populated" view downstream.
 *   4. (Bonus) Telemetry event picking with DeepPick.
 */

import type {
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types.ts";

// ---------------------------------------------------------------------------
// Example 1: Immutable Redux-style state tree
// ---------------------------------------------------------------------------
//
// Reducers receive a read-only snapshot of the state and must return a new
// object. DeepReadonly enforces this at compile time across the whole tree,
// including nested Maps and Sets, so a careless `state.user.prefs.theme = ...`
// is flagged at the call site.

interface AppState {
  user: {
    id: string;
    name: string;
    prefs: {
      theme: "light" | "dark";
      notifications: {
        email: boolean;
        push: boolean;
      };
    };
  };
  cart: {
    items: Array<{ sku: string; qty: number }>;
    promoCodes: Set<string>;
  };
  sessions: Map<string, { lastSeen: number }>;
}

export type ReadonlyAppState = DeepReadonly<AppState>;

export const reducer = (
  state: ReadonlyAppState,
  action: { type: "toggle-theme" },
): ReadonlyAppState => {
  switch (action.type) {
    case "toggle-theme":
      // Returning a new object is the only way to "mutate" state.
      return {
        ...state,
        user: {
          ...state.user,
          prefs: {
            ...state.user.prefs,
            theme: state.user.prefs.theme === "light" ? "dark" : "light",
          },
        },
      };
  }
};

// If you ever need a mutable working copy (e.g. inside an Immer producer)
// you can recover it with DeepMutable.
export type DraftAppState = DeepMutable<ReadonlyAppState>;

// ---------------------------------------------------------------------------
// Example 2: Layered configuration with defaults
// ---------------------------------------------------------------------------
//
// A typical pattern: the runtime loads a partial config from a file, merges
// it on top of defaults, and the resulting object must be fully populated.
// DeepPartial relaxes the input type; DeepRequired tightens the output type.

export interface ServerConfig {
  host: string;
  port: number;
  tls: {
    enabled: boolean;
    cert: {
      path: string;
      passphrase: string;
    };
  };
  logging: {
    level: "trace" | "debug" | "info" | "warn" | "error";
    sinks: string[];
  };
}

export type UserConfig = DeepPartial<ServerConfig>;
export type ResolvedConfig = DeepRequired<ServerConfig>;

export const mergeConfig = (
  defaults: ResolvedConfig,
  override: UserConfig,
): ResolvedConfig => {
  // A real implementation would deep-merge; here we keep it short.
  return {
    ...defaults,
    ...override,
    tls: {
      ...defaults.tls,
      ...(override.tls ?? {}),
      cert: { ...defaults.tls.cert, ...(override.tls?.cert ?? {}) },
    },
    logging: {
      ...defaults.logging,
      ...(override.logging ?? {}),
    },
  };
};

// Valid: empty override is allowed.
export const emptyOverride: UserConfig = {};

// Valid: deep partial override.
export const partialOverride: UserConfig = {
  tls: { cert: { path: "/etc/cert.pem" } },
};

// ---------------------------------------------------------------------------
// Example 3: API responses that may be sparsely populated
// ---------------------------------------------------------------------------
//
// External APIs frequently omit fields. Modelling the response as
// DeepRequired<ApiUser> at the boundary forces the parser to fill in all
// gaps before the rest of the code sees the value.

export interface ApiUser {
  id: string;
  profile: {
    displayName: string;
    avatarUrl: string;
    bio: string;
  };
  preferences: {
    locale: string;
    timezone: string;
    flags: {
      betaTester: boolean;
      darkMode: boolean;
    };
  };
}

export type RawApiUser = DeepPartial<ApiUser>;
export type CompleteApiUser = DeepRequired<ApiUser>;

export const hydrateUser = (
  raw: RawApiUser,
  defaults: CompleteApiUser,
): CompleteApiUser => ({
  id: raw.id ?? defaults.id,
  profile: {
    displayName: raw.profile?.displayName ?? defaults.profile.displayName,
    avatarUrl: raw.profile?.avatarUrl ?? defaults.profile.avatarUrl,
    bio: raw.profile?.bio ?? defaults.profile.bio,
  },
  preferences: {
    locale: raw.preferences?.locale ?? defaults.preferences.locale,
    timezone: raw.preferences?.timezone ?? defaults.preferences.timezone,
    flags: {
      betaTester:
        raw.preferences?.flags?.betaTester ??
        defaults.preferences.flags.betaTester,
      darkMode:
        raw.preferences?.flags?.darkMode ??
        defaults.preferences.flags.darkMode,
    },
  },
});

// ---------------------------------------------------------------------------
// Example 4 (bonus): Selecting a sub-shape with DeepPick
// ---------------------------------------------------------------------------
//
// Useful for telemetry: emit only a whitelisted set of fields so we never
// accidentally leak PII into analytics.

export type UserTelemetryPayload = DeepPick<
  ApiUser,
  "id" | "preferences.locale" | "preferences.flags.darkMode"
>;

export const buildTelemetry = (
  user: CompleteApiUser,
): UserTelemetryPayload => ({
  id: user.id,
  preferences: {
    locale: user.preferences.locale,
    flags: { darkMode: user.preferences.flags.darkMode },
  },
});
