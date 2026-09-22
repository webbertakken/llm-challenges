import type {
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types.js";

/**
 * Immutable store. State is frozen at the type level; selectors receive a
 * DeepPick slice instead of the whole tree.
 */
export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  tags: string[];
};

export type AppState = {
  todos: Todo[];
  filter: "all" | "open" | "done";
  session: {
    user: { id: string; name: string };
    flags: Map<string, boolean>;
  };
};

export type FrozenState = DeepReadonly<AppState>;
export type TodoSlice = DeepPick<AppState, "todos" | "filter">;

export function selectTitles(state: FrozenState): readonly string[] {
  return state.todos.map((todo) => todo.title);
}

export function completeTodo(state: FrozenState, id: string): FrozenState {
  return {
    ...state,
    todos: state.todos.map((todo) =>
      todo.id === id ? { ...todo, completed: true } : todo,
    ),
  };
}

export function visibleTodos(slice: DeepReadonly<TodoSlice>): readonly DeepReadonly<Todo>[] {
  return slice.todos.filter((todo) => {
    if (slice.filter === "done") return todo.completed;
    if (slice.filter === "open") return !todo.completed;
    return true;
  });
}

/**
 * Deployment config. Callers pass a DeepPartial override; the resolver
 * returns the DeepRequired shape, which is the full config.
 */
export type AppConfig = {
  server: {
    host: string;
    port: number;
    tls: { enabled: boolean; certPath: string };
  };
  features: { beta: boolean; darkMode: boolean };
  retries: [number, number, number];
};

export type ConfigOverride = DeepPartial<AppConfig>;
export type ResolvedConfig = DeepRequired<ConfigOverride>;

export const defaultConfig: ResolvedConfig = {
  server: {
    host: "0.0.0.0",
    port: 443,
    tls: { enabled: true, certPath: "/etc/certs/server.pem" },
  },
  features: { beta: false, darkMode: true },
  retries: [100, 500, 2000],
};

export function resolveConfig(override: ConfigOverride): ResolvedConfig {
  const retries = override.retries;
  return {
    server: {
      host: override.server?.host ?? defaultConfig.server.host,
      port: override.server?.port ?? defaultConfig.server.port,
      tls: {
        enabled: override.server?.tls?.enabled ?? defaultConfig.server.tls.enabled,
        certPath: override.server?.tls?.certPath ?? defaultConfig.server.tls.certPath,
      },
    },
    features: {
      beta: override.features?.beta ?? defaultConfig.features.beta,
      darkMode: override.features?.darkMode ?? defaultConfig.features.darkMode,
    },
    retries: [
      retries?.[0] ?? defaultConfig.retries[0],
      retries?.[1] ?? defaultConfig.retries[1],
      retries?.[2] ?? defaultConfig.retries[2],
    ],
  };
}

/**
 * API client. Responses are DeepReadonly, editors hold a DeepMutable draft,
 * and PATCH bodies are DeepPartial.
 */
export type UserResponse = {
  id: string;
  profile: { displayName: string; emails: string[] };
  roles: Set<string>;
  preferences: Map<string, { value: string; locked: boolean }>;
};

export type UserView = DeepReadonly<UserResponse>;
export type UserDraft = DeepMutable<UserView>;
export type UserPatch = DeepPartial<UserResponse>;

export function toDraft(view: UserView): UserDraft {
  const preferences = new Map<string, { value: string; locked: boolean }>();
  view.preferences.forEach((value, key) => {
    preferences.set(key, { value: value.value, locked: value.locked });
  });
  return {
    id: view.id,
    profile: {
      displayName: view.profile.displayName,
      emails: [...view.profile.emails],
    },
    roles: new Set(view.roles),
    preferences,
  };
}

export function rename(draft: UserDraft, name: string): void {
  draft.profile.displayName = name;
  draft.profile.emails.push(`${name.replaceAll(" ", ".").toLowerCase()}@example.com`);
  draft.roles.add("editor");
  draft.preferences.set("theme", { value: "dark", locked: false });
}

export function applyPatch(draft: UserDraft, patch: UserPatch): void {
  if (patch.id !== undefined) draft.id = patch.id;
  if (patch.profile?.displayName !== undefined) {
    draft.profile.displayName = patch.profile.displayName;
  }
  if (patch.profile?.emails !== undefined) {
    draft.profile.emails = [...patch.profile.emails];
  }
  if (patch.roles !== undefined) draft.roles = new Set(patch.roles);
  if (patch.preferences !== undefined) {
    const next = new Map<string, { value: string; locked: boolean }>();
    patch.preferences.forEach((value, key) => {
      if (value?.value !== undefined && value.locked !== undefined) {
        next.set(key, { value: value.value, locked: value.locked });
      }
    });
    draft.preferences = next;
  }
}
