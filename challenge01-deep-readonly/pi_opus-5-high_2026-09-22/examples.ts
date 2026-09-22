/**
 * Real-world usage examples for the recursive utility types.
 * Run with `npx tsx examples.ts`.
 */
import type {
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types.js";

/* -------------------------------------------------------------------------- */
/* Example 1 — immutable Redux-style store                                    */
/* -------------------------------------------------------------------------- */

interface AppState {
  session: {
    user: { id: string; name: string; roles: string[] } | null;
    permissions: Set<string>;
  };
  entities: {
    todos: Map<string, { id: string; title: string; done: boolean }>;
  };
  ui: { theme: "light" | "dark"; sidebarOpen: boolean };
}

/** What reducers hand out: nothing downstream can mutate it. */
type ReadonlyAppState = DeepReadonly<AppState>;

/** What a reducer works with internally, after `structuredClone`. */
type DraftAppState = DeepMutable<ReadonlyAppState>;

function toggleSidebar(state: ReadonlyAppState): ReadonlyAppState {
  const draft: DraftAppState = structuredClone(state) as DraftAppState;
  draft.ui.sidebarOpen = !draft.ui.sidebarOpen;
  return draft;
}

function describeUser(state: ReadonlyAppState): string {
  // `state.session.user?.roles` is a `readonly string[]`: safe to read, impossible
  // to sort in place by accident.
  return state.session.user ? `${state.session.user.name} (${state.session.user.roles.join(", ")})` : "anonymous";
}

/* -------------------------------------------------------------------------- */
/* Example 2 — layered configuration                                          */
/* -------------------------------------------------------------------------- */

type ServerConfig = {
  http: { host: string; port: number; cors: { origins: string[]; credentials: boolean } };
  database: { url: string; pool: { min: number; max: number } };
  telemetry: { enabled: boolean; sampleRate: number };
};

/** Defaults are complete; every override layer is deeply optional. */
type ConfigOverride = DeepPartial<ServerConfig>;

const defaults: ServerConfig = {
  http: { host: "0.0.0.0", port: 8080, cors: { origins: ["*"], credentials: false } },
  database: { url: "postgres://localhost/app", pool: { min: 1, max: 10 } },
  telemetry: { enabled: true, sampleRate: 0.1 },
};

const productionOverride: ConfigOverride = {
  http: { port: 443, cors: { credentials: true } },
  telemetry: { sampleRate: 0.01 },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    const current = result[key];
    result[key] = isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value;
  }
  return result;
}

/** The only cast in the file: the dynamic merge is re-attached to the static shape. */
function applyOverride(base: ServerConfig, override: ConfigOverride): ServerConfig {
  return deepMerge(base, override) as ServerConfig;
}

const resolvedConfig: ServerConfig = applyOverride(defaults, productionOverride);

/* -------------------------------------------------------------------------- */
/* Example 3 — API responses: narrow projections and hardened payloads        */
/* -------------------------------------------------------------------------- */

interface UserResponse {
  data: {
    user: {
      id: string;
      profile: { displayName: string; avatarUrl?: string; bio?: string };
      stats: { followers: number; following: number };
    };
  };
  meta: { requestId: string; durationMs: number };
}

/** A GraphQL-ish projection expressed purely with dot-paths. */
type UserCard = DeepPick<UserResponse, "data.user.id" | "data.user.profile.displayName" | "meta.requestId">;

function toCard(response: DeepReadonly<UserResponse>): UserCard {
  return {
    data: { user: { id: response.data.user.id, profile: { displayName: response.data.user.profile.displayName } } },
    meta: { requestId: response.meta.requestId },
  };
}

/**
 * A partially-populated payload coming off the wire, promoted to a fully
 * populated one after validation fills in every gap.
 */
type DraftUser = DeepPartial<UserResponse["data"]["user"]>;
type CompleteUser = DeepRequired<DraftUser>;

function completeUser(draft: DraftUser): CompleteUser {
  return {
    id: draft.id ?? "unknown",
    profile: {
      displayName: draft.profile?.displayName ?? "Anonymous",
      avatarUrl: draft.profile?.avatarUrl ?? "/avatars/default.png",
      bio: draft.profile?.bio ?? "",
    },
    stats: { followers: draft.stats?.followers ?? 0, following: draft.stats?.following ?? 0 },
  };
}

/* -------------------------------------------------------------------------- */
/* Demo                                                                       */
/* -------------------------------------------------------------------------- */

const initialState: ReadonlyAppState = {
  session: { user: { id: "u1", name: "Ada", roles: ["admin"] }, permissions: new Set(["read"]) },
  entities: { todos: new Map([["t1", { id: "t1", title: "Write types", done: true }]]) },
  ui: { theme: "dark", sidebarOpen: false },
};

console.log(describeUser(initialState));
console.log("sidebarOpen after toggle:", toggleSidebar(initialState).ui.sidebarOpen);
console.log("resolved port:", resolvedConfig.http.port, "cors:", resolvedConfig.http.cors);
console.log(
  "card:",
  JSON.stringify(
    toCard({
      data: {
        user: { id: "u1", profile: { displayName: "Ada" }, stats: { followers: 3, following: 4 } },
      },
      meta: { requestId: "req-1", durationMs: 12 },
    }),
  ),
);
console.log("completed user:", JSON.stringify(completeUser({ profile: { displayName: "Grace" } })));
