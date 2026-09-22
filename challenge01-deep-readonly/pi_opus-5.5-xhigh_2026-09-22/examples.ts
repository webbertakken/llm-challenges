/**
 * Real-world usage of the recursive utility types. Runnable with `npx tsx examples.ts`.
 */
import type { DeepMutable, DeepPartial, DeepPick, DeepReadonly, DeepRequired } from "./types.js";

// ---------------------------------------------------------------------------
// 1. Immutable Redux-style state: reducers can only produce new state.
// ---------------------------------------------------------------------------

interface Todo {
  id: number;
  title: string;
  done: boolean;
  tags: string[];
}

interface TodoState {
  todos: Todo[];
  filter: { status: "all" | "open" | "done"; tags: Set<string> };
  meta: { lastUpdated: Date | null };
}

type State = DeepReadonly<TodoState>;

type Action =
  | { type: "added"; todo: Todo }
  | { type: "toggled"; id: number }
  | { type: "tagFilterAdded"; tag: string };

/** Freezes plain objects and arrays recursively; the return type forbids every mutation at compile time. */
function deepFreeze<T>(value: T): DeepReadonly<T>;
function deepFreeze(value: unknown): unknown {
  if (typeof value === "object" && value !== null && !(value instanceof Date)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "added":
      return { ...state, todos: [...state.todos, action.todo], meta: { lastUpdated: new Date() } };
    case "toggled":
      return {
        ...state,
        todos: state.todos.map((todo) => (todo.id === action.id ? { ...todo, done: !todo.done } : todo)),
      };
    case "tagFilterAdded":
      return { ...state, filter: { ...state.filter, tags: new Set([...state.filter.tags, action.tag]) } };
  }
}

/** The compiler rejects every in-place update. Type-checked, never executed. */
function forbiddenMutations(state: State): void {
  // @ts-expect-error - cannot push into a readonly array
  state.todos.push({ id: 3, title: "x", done: false, tags: [] });
  // @ts-expect-error - nested objects are readonly
  state.todos[0].done = true;
  // @ts-expect-error - nested arrays are readonly
  state.todos[0].tags.sort();
  // @ts-expect-error - sets become ReadonlySet
  state.filter.tags.add("urgent");
}

// ---------------------------------------------------------------------------
// 2. Config objects: users supply a DeepPartial, the app works with a DeepRequired.
// ---------------------------------------------------------------------------

interface ServerConfig {
  host?: string;
  port?: number;
  tls?: { enabled?: boolean; certPath?: string };
  logging?: { level?: "debug" | "info" | "warn"; destinations?: ("stdout" | "file")[] };
  retry?: { attempts?: number; backoffMs?: [initial?: number, max?: number] };
}

type ResolvedConfig = DeepRequired<ServerConfig>;
type ConfigOverrides = DeepPartial<ServerConfig>;

const defaults: ResolvedConfig = {
  host: "127.0.0.1",
  port: 8080,
  tls: { enabled: false, certPath: "" },
  logging: { level: "info", destinations: ["stdout"] },
  retry: { attempts: 3, backoffMs: [100, 5_000] },
};

function resolveConfig(overrides: ConfigOverrides): ResolvedConfig {
  return {
    host: overrides.host ?? defaults.host,
    port: overrides.port ?? defaults.port,
    tls: { ...defaults.tls, ...overrides.tls },
    logging: {
      level: overrides.logging?.level ?? defaults.logging.level,
      destinations: overrides.logging?.destinations ?? defaults.logging.destinations,
    },
    retry: {
      attempts: overrides.retry?.attempts ?? defaults.retry.attempts,
      backoffMs: [
        overrides.retry?.backoffMs?.[0] ?? defaults.retry.backoffMs[0],
        overrides.retry?.backoffMs?.[1] ?? defaults.retry.backoffMs[1],
      ],
    },
  };
}

// @ts-expect-error - a resolved config must be complete all the way down
const incomplete: ResolvedConfig = { ...defaults, tls: { enabled: true } };
void incomplete;

// ---------------------------------------------------------------------------
// 3. API response types: DeepPick describes exactly what a view is allowed to expose.
// ---------------------------------------------------------------------------

interface ApiUser {
  id: string;
  email: string;
  passwordHash: string;
  profile: { displayName: string; bio: string; avatar: { url: string; width: number; height: number } };
  orders: { id: number; total: number; paymentToken: string }[];
}

type PublicUser = DeepPick<ApiUser, "id" | "profile.displayName" | "profile.avatar.url" | "orders.id" | "orders.total">;

function toPublicUser(user: ApiUser): PublicUser {
  return {
    id: user.id,
    profile: { displayName: user.profile.displayName, avatar: { url: user.profile.avatar.url } },
    orders: user.orders.map(({ id, total }) => ({ id, total })),
  };
}

function leakyProjection(user: ApiUser): PublicUser {
  // @ts-expect-error - secrets that were not picked cannot sneak into the public shape
  return { id: user.id, passwordHash: user.passwordHash, profile: { displayName: "", avatar: { url: "" } }, orders: [] };
}

// ---------------------------------------------------------------------------
// 4. DeepMutable: an editable draft of frozen state (e.g. a form or a test fixture).
// ---------------------------------------------------------------------------

type TodoDraft = DeepMutable<State>;

function toDraft(state: State): TodoDraft {
  return {
    todos: state.todos.map((todo) => ({ ...todo, tags: [...todo.tags] })),
    filter: { status: state.filter.status, tags: new Set(state.filter.tags) },
    meta: { lastUpdated: state.meta.lastUpdated },
  };
}

// ---------------------------------------------------------------------------
// Run the examples.
// ---------------------------------------------------------------------------

const initial = deepFreeze<TodoState>({
  todos: [{ id: 1, title: "Write types", done: false, tags: ["ts"] }],
  filter: { status: "all", tags: new Set() },
  meta: { lastUpdated: null },
});

const next = [
  { type: "added", todo: { id: 2, title: "Write tests", done: false, tags: [] } },
  { type: "toggled", id: 1 },
  { type: "tagFilterAdded", tag: "ts" },
] satisfies Action[];

const finalState = next.reduce<State>(reducer, initial);
console.log("todos:", finalState.todos.map((t) => `${t.id}:${t.title}:${t.done ? "done" : "open"}`).join(", "));
console.log("filter tags:", [...finalState.filter.tags].join(", "));
console.log("initial state untouched and frozen:", initial.todos.length === 1 && Object.isFrozen(initial.todos[0]));

const config = resolveConfig({ port: 9000, tls: { enabled: true }, retry: { backoffMs: [250] } });
console.log("config:", JSON.stringify(config));

const publicUser = toPublicUser({
  id: "u1",
  email: "ada@example.com",
  passwordHash: "not-for-you",
  profile: { displayName: "Ada", bio: "Analyst", avatar: { url: "/ada.png", width: 64, height: 64 } },
  orders: [{ id: 7, total: 42, paymentToken: "secret" }],
});
console.log("public user:", JSON.stringify(publicUser));

const draft = toDraft(finalState);
draft.todos[0].tags.push("draft");
console.log("draft is editable, state is not:", draft.todos[0].tags.join(","), "vs", finalState.todos[0].tags.join(","));

export const typeCheckedOnly = [forbiddenMutations, leakyProjection];
