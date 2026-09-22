import type { DeepMutable, DeepPartial, DeepPick, DeepReadonly, DeepRequired } from "./types.js";

// ---------------------------------------------------------------- 1. Immutable Redux-style state

interface Todo {
  id: number;
  title: string;
  tags: string[];
}

interface AppState {
  todos: Todo[];
  filter: { status: "all" | "done" | "open"; search: string };
  cache: Map<number, Todo>;
}

type State = DeepReadonly<AppState>;

type Action =
  | { type: "add"; todo: Todo }
  | { type: "tag"; id: number; tag: string };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add":
      return { ...state, todos: [...state.todos, action.todo] };
    case "tag":
      return {
        ...state,
        todos: state.todos.map((t) => (t.id === action.id ? { ...t, tags: [...t.tags, action.tag] } : t)),
      };
  }
}

// Editing a copy: DeepMutable describes the writable clone of a readonly entity.
export function editableCopy(todo: DeepReadonly<Todo>): DeepMutable<DeepReadonly<Todo>> {
  return { ...todo, tags: [...todo.tags] };
}

// ---------------------------------------------------------------- 2. Config objects with deep defaults

interface ServerConfig {
  http: { port: number; host: string; tls?: { cert: string; key: string } };
  logging: { level: "debug" | "info" | "warn"; destinations: string[] };
}

const defaults: DeepRequired<ServerConfig> = {
  http: { port: 8080, host: "localhost", tls: { cert: "", key: "" } },
  logging: { level: "info", destinations: ["stdout"] },
};

export function loadConfig(overrides: DeepPartial<ServerConfig>): DeepReadonly<ServerConfig> {
  return {
    http: {
      port: overrides.http?.port ?? defaults.http.port,
      host: overrides.http?.host ?? defaults.http.host,
      tls: overrides.http?.tls?.cert && overrides.http.tls.key
        ? { cert: overrides.http.tls.cert, key: overrides.http.tls.key }
        : undefined,
    },
    logging: {
      level: overrides.logging?.level ?? defaults.logging.level,
      destinations: overrides.logging?.destinations ?? defaults.logging.destinations,
    },
  };
}

export const config = loadConfig({ http: { port: 3000 } });

// ---------------------------------------------------------------- 3. Narrowed API response types

interface UserResponse {
  id: string;
  profile: { name: string; avatarUrl: string; bio: string };
  settings: { theme: "light" | "dark"; notifications: { email: boolean; push: boolean } };
}

// A list view only needs a small slice of the payload.
type UserListItem = DeepPick<UserResponse, "id" | "profile.name" | "settings.theme">;

export function toListItem(user: UserResponse): UserListItem {
  return { id: user.id, profile: { name: user.profile.name }, settings: { theme: user.settings.theme } };
}

// PATCH bodies accept any subset of the resource.
export type UserPatch = DeepPartial<Omit<UserResponse, "id">>;
export const patch: UserPatch = { settings: { notifications: { push: false } } };
