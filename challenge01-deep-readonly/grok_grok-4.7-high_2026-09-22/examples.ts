import type {
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types.js";

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  tags: string[];
  meta: { createdAt: string; updatedAt?: string };
}

export interface AppState {
  todos: Todo[];
  filter: "all" | "open" | "done";
  viewer: { id: string; name: string };
}

/** Store snapshot handed to selectors. Callers can read it but not mutate it. */
export type ImmutableState = DeepReadonly<AppState>;

/** Draft inside a producer, after readonly has been stripped. */
export type TodoDraft = DeepMutable<Todo>;

export function selectOpenCount(state: ImmutableState): number {
  return state.todos.filter((todo) => !todo.done).length;
}

export function selectViewerName(state: ImmutableState): string {
  return state.viewer.name;
}

export function renameTodo(draft: TodoDraft, title: string): void {
  draft.title = title;
  draft.tags.push("edited");
  draft.meta.updatedAt = new Date().toISOString();
}

export interface AppConfig {
  server: {
    host: string;
    port: number;
    tls: { enabled: boolean; certPath: string };
  };
  features: { beta: boolean; flags: Record<string, boolean> };
}

/** User-supplied overrides: every field, at every depth, may be omitted. */
export type ConfigOverrides = DeepPartial<AppConfig>;

export type ResolvedConfig = DeepRequired<AppConfig>;

export function resolveConfig(base: AppConfig, overrides: ConfigOverrides): ResolvedConfig {
  return {
    server: {
      host: overrides.server?.host ?? base.server.host,
      port: overrides.server?.port ?? base.server.port,
      tls: {
        enabled: overrides.server?.tls?.enabled ?? base.server.tls.enabled,
        certPath: overrides.server?.tls?.certPath ?? base.server.tls.certPath,
      },
    },
    features: {
      beta: overrides.features?.beta ?? base.features.beta,
      flags: { ...base.features.flags, ...overrides.features?.flags },
    },
  };
}

export interface UserResponse {
  id: string;
  profile: {
    name: string;
    email: string;
    address: { city: string; zip: string };
  };
  roles: string[];
  sessions: Map<string, { issuedAt: string; device: { os: string } }>;
}

/** Cached response body. Nested maps, arrays, and objects are frozen. */
export type CachedUser = DeepReadonly<UserResponse>;

/** List-row projection. Unmentioned branches such as email and sessions are absent. */
export type UserSummary = DeepPick<UserResponse, "id" | "profile.name" | "roles">;

export function summarize(user: CachedUser): UserSummary {
  return {
    id: user.id,
    profile: { name: user.profile.name },
    roles: user.roles,
  };
}

export function sessionDevice(user: CachedUser, sessionId: string): string | undefined {
  return user.sessions.get(sessionId)?.device.os;
}
