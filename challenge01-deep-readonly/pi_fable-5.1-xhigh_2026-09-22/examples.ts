/**
 * Real-world usage of the deep utility types.
 * Type-check with:
 *   npx tsgo --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext
 */
import type {
  DeepKeyOf,
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types.js";

// ---------------------------------------------------------------------------
// 1. Immutable Redux-style state
// ---------------------------------------------------------------------------

type Todo = { id: string; title: string; done: boolean; tags: string[] };

type AppState = {
  todos: Todo[];
  filter: "all" | "active" | "done";
  byId: Map<string, Todo>;
  selected: Set<string>;
};

/** Reducers receive frozen state and must return a new one. */
export type ImmutableState = DeepReadonly<AppState>;

type Action = { type: "toggle"; id: string } | { type: "setFilter"; filter: AppState["filter"] };

export function reducer(state: ImmutableState, action: Action): ImmutableState {
  switch (action.type) {
    case "toggle":
      // state.todos.push(...) or todo.done = !todo.done would not compile.
      return {
        ...state,
        todos: state.todos.map((todo) => (todo.id === action.id ? { ...todo, done: !todo.done } : todo)),
      };
    case "setFilter":
      return { ...state, filter: action.filter };
  }
}

/** Test fixtures need a mutable draft; strip readonly again. */
export function createDraft(state: ImmutableState): DeepMutable<ImmutableState> {
  return structuredClone(state) as DeepMutable<ImmutableState>;
}

// ---------------------------------------------------------------------------
// 2. Configuration objects with overrides
// ---------------------------------------------------------------------------

type ServerConfig = {
  host: string;
  port: number;
  tls: { cert: string; key: string; ciphers: string[] };
  logging: { level: "debug" | "info" | "warn"; destinations: ("stdout" | "file")[] };
};

const defaults: DeepReadonly<ServerConfig> = {
  host: "127.0.0.1",
  port: 8080,
  tls: { cert: "cert.pem", key: "key.pem", ciphers: ["TLS_AES_256_GCM_SHA384"] },
  logging: { level: "info", destinations: ["stdout"] },
};

/** Users supply only what they want to change, however deep. */
export type ConfigOverrides = DeepPartial<ServerConfig>;

export function loadConfig(overrides: ConfigOverrides): ServerConfig {
  return {
    host: overrides.host ?? defaults.host,
    port: overrides.port ?? defaults.port,
    tls: {
      cert: overrides.tls?.cert ?? defaults.tls.cert,
      key: overrides.tls?.key ?? defaults.tls.key,
      ciphers: [...(overrides.tls?.ciphers ?? defaults.tls.ciphers)],
    },
    logging: {
      level: overrides.logging?.level ?? defaults.logging.level,
      destinations: [...(overrides.logging?.destinations ?? defaults.logging.destinations)],
    },
  };
}

export const productionConfig = loadConfig({ port: 443, logging: { level: "warn" } });

// ---------------------------------------------------------------------------
// 3. API responses: sparse wire format, fully validated domain object
// ---------------------------------------------------------------------------

type UserProfile = {
  id: string;
  name: { first?: string; last?: string };
  contact: { email?: string; phones?: { kind: "home" | "work"; number?: string }[] };
  createdAt: Date;
};

/** What the API is allowed to omit before validation. */
export type UserProfileWire = DeepPartial<UserProfile>;

/** What the rest of the app can rely on after validation. */
export type ValidatedUserProfile = DeepRequired<UserProfile>;

export function validateProfile(wire: UserProfileWire): ValidatedUserProfile {
  if (!wire.id || !wire.name?.first || !wire.name.last || !wire.contact?.email || !wire.createdAt) {
    throw new Error("Incomplete profile");
  }
  const phones = (wire.contact.phones ?? []).flatMap((phone) =>
    phone.kind && phone.number ? [{ kind: phone.kind, number: phone.number }] : [],
  );
  return {
    id: wire.id,
    name: { first: wire.name.first, last: wire.name.last },
    contact: { email: wire.contact.email, phones },
    createdAt: wire.createdAt,
  };
}

// ---------------------------------------------------------------------------
// 4. Projections: a view model that names exactly the fields it renders
// ---------------------------------------------------------------------------

/** The avatar card only needs the name and the primary email. */
export type AvatarCardProps = DeepPick<UserProfile, "id" | "name.first" | "contact.email">;

export function toAvatarCard(profile: ValidatedUserProfile): AvatarCardProps {
  return {
    id: profile.id,
    name: { first: profile.name.first },
    contact: { email: profile.contact.email },
  };
}

/** A GraphQL-like selection: the response type is derived from the requested paths. */
export function select<T, const P extends readonly DeepKeyOf<T>[]>(
  source: T,
  paths: P,
): DeepPick<T, P[number]> {
  return pickPaths(source, paths) as DeepPick<T, P[number]>;
}

function pickPaths(source: unknown, paths: readonly string[]): unknown {
  const result: Record<string, unknown> = {};
  for (const path of paths) {
    let from: unknown = source;
    let into = result;
    const segments = path.split(".");
    for (const [index, segment] of segments.entries()) {
      if (typeof from !== "object" || from === null) break;
      const value = (from as Record<string, unknown>)[segment];
      if (index === segments.length - 1) {
        into[segment] = value;
      } else {
        into[segment] ??= {};
        into = into[segment] as Record<string, unknown>;
        from = value;
      }
    }
  }
  return result;
}

declare const profile: ValidatedUserProfile;
export const card = select(profile, ["id", "name.first", "contact.email"]);
export const cardName: string = card.name.first;
