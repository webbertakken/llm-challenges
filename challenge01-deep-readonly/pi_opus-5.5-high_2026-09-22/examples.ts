import type { DeepMutable, DeepPartial, DeepPick, DeepReadonly } from "./types.js";

// ---------------------------------------------------------------------------
// Example 1: immutable Redux-style state
// ---------------------------------------------------------------------------

type Todo = { id: number; title: string; done: boolean; tags: string[] };

type AppState = DeepReadonly<{
  todos: Todo[];
  filter: { status: "all" | "open" | "done"; tags: Set<string> };
  cache: Map<number, Todo>;
}>;

type Action = { type: "add"; todo: Todo } | { type: "toggle"; id: number };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "add":
      // state.todos.push(action.todo) would not compile: the array is readonly.
      return { ...state, todos: [...state.todos, action.todo] };
    case "toggle":
      return {
        ...state,
        todos: state.todos.map((todo) => (todo.id === action.id ? { ...todo, done: !todo.done } : todo)),
      };
  }
}

/** Immer-style draft: a mutable deep copy the caller may freely modify. */
export function produce(state: AppState, recipe: (draft: DeepMutable<AppState>) => void): AppState {
  const draft: DeepMutable<AppState> = {
    todos: state.todos.map((todo) => ({ ...todo, tags: [...todo.tags] })),
    filter: { status: state.filter.status, tags: new Set(state.filter.tags) },
    cache: new Map([...state.cache].map(([id, todo]) => [id, { ...todo, tags: [...todo.tags] }])),
  };
  recipe(draft);
  return draft;
}

// ---------------------------------------------------------------------------
// Example 2: configuration with deep defaults
// ---------------------------------------------------------------------------

type ServerConfig = {
  http: { port: number; host: string; tls?: { cert: string; key: string } };
  database: { url: string; pool: { min: number; max: number } };
  features: string[];
};

const defaults: DeepReadonly<ServerConfig> = {
  http: { port: 8080, host: "127.0.0.1" },
  database: { url: "postgres://localhost/app", pool: { min: 1, max: 10 } },
  features: [],
};

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeDeep(base: PlainObject, override: PlainObject): PlainObject {
  const result: PlainObject = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    const current = result[key];
    result[key] = isPlainObject(current) && isPlainObject(value) ? mergeDeep(current, value) : value;
  }
  return result;
}

function isServerConfig(value: PlainObject): value is ServerConfig {
  return isPlainObject(value.http) && isPlainObject(value.database) && Array.isArray(value.features);
}

/** Callers only specify what differs from the defaults; the result is frozen. */
export function loadConfig(overrides: DeepPartial<ServerConfig>): DeepReadonly<ServerConfig> {
  const merged = mergeDeep(defaults, overrides);
  if (!isServerConfig(merged)) throw new Error("Invalid configuration");
  return merged;
}

export const productionConfig = loadConfig({ http: { port: 443 }, database: { pool: { max: 50 } } });

// ---------------------------------------------------------------------------
// Example 3: API response projections
// ---------------------------------------------------------------------------

type UserResponse = {
  id: string;
  profile: {
    displayName: string;
    email: string;
    address: { street: string; city: string; country: string };
  };
  billing: { plan: "free" | "pro"; card?: { last4: string; expiry: string } };
};

/** A list view only needs a projection of the full response. */
export type UserListItem = DeepPick<UserResponse, "id" | "profile.displayName" | "profile.address.city" | "billing.plan">;

export function toListItem(user: DeepReadonly<UserResponse>): UserListItem {
  return {
    id: user.id,
    profile: { displayName: user.profile.displayName, address: { city: user.profile.address.city } },
    billing: { plan: user.billing.plan },
  };
}

/** PATCH endpoints accept any deep subset of the resource. */
export type UserPatch = DeepPartial<Omit<UserResponse, "id">>;

export const patch: UserPatch = { profile: { address: { city: "Amsterdam" } } };
