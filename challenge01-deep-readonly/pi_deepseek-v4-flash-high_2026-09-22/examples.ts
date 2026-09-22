/**
 * Real-world usage examples for the recursive utility types.
 *
 * Every example is a small, self-contained slice of the kind of code these
 * types are for: immutable state, layered configuration, API projections and
 * serialisation boundaries.
 */

import type { DeepMutable, DeepPartial, DeepPick, DeepReadonly, DeepRequired } from "./types.js";

/* ------------------------------------------------------------------ *
 * Example 1 - Immutable Redux-style state                             *
 * ------------------------------------------------------------------ */

type Todo = {
  id: string;
  title: string;
  tags: string[];
};

type TodoState = DeepReadonly<{
  byId: Map<string, Todo>;
  order: string[];
  filter: { query: string; tags: Set<string> };
}>;

/** Returns a brand new state with one tag appended; the input stays frozen. */
function withTag(state: TodoState, id: string, tag: string): TodoState {
  const todo = state.byId.get(id);
  if (todo === undefined) {
    return state;
  }
  const byId = new Map(state.byId);
  byId.set(id, { ...todo, tags: [...todo.tags, tag] });
  return { byId, order: state.order, filter: state.filter };
}

const initialTodos: TodoState = {
  byId: new Map([["t1", { id: "t1", title: "Write types", tags: ["ts"] }]]),
  order: ["t1"],
  filter: { query: "", tags: new Set(["ts"]) },
};

const taggedTodos = withTag(initialTodos, "t1", "generics");
console.log("example 1:", taggedTodos.byId.get("t1")?.tags);

/* ------------------------------------------------------------------ *
 * Example 2 - Layered configuration                                   *
 * ------------------------------------------------------------------ */

type AppConfig = {
  server: { host: string; port: number; tls: { enabled: boolean; cert: string } };
  features: { darkMode: boolean; beta: string[] };
};

const defaults: DeepRequired<AppConfig> = {
  server: { host: "localhost", port: 8080, tls: { enabled: false, cert: "" } },
  features: { darkMode: false, beta: [] },
};

/** Merge user overrides on top of the defaults, filling in every gap. */
function resolveConfig(overrides: DeepPartial<AppConfig>): DeepRequired<AppConfig> {
  return {
    server: {
      host: overrides.server?.host ?? defaults.server.host,
      port: overrides.server?.port ?? defaults.server.port,
      tls: {
        enabled: overrides.server?.tls?.enabled ?? defaults.server.tls.enabled,
        cert: overrides.server?.tls?.cert ?? defaults.server.tls.cert,
      },
    },
    features: {
      darkMode: overrides.features?.darkMode ?? defaults.features.darkMode,
      beta: overrides.features?.beta ?? defaults.features.beta,
    },
  };
}

console.log("example 2:", resolveConfig({ server: { port: 3000 } }).server.port);

/* ------------------------------------------------------------------ *
 * Example 3 - API response projection                                 *
 * ------------------------------------------------------------------ */

type ApiUser = {
  id: string;
  profile: { name: string; email: string; address: { city: string; zip: string } };
  settings: { theme: string; notifications: Set<string> };
  audit: { createdAt: string; updatedAt: string };
};

type UserCard = DeepPick<ApiUser, "id" | "profile.name" | "settings.theme">;

const card: UserCard = { id: "u1", profile: { name: "Ada" }, settings: { theme: "dark" } };
console.log("example 3:", card.profile.name, card.settings.theme);

/* ------------------------------------------------------------------ *
 * Example 4 - Serialisation boundary                                  *
 * ------------------------------------------------------------------ */

type FrozenDocument = DeepReadonly<{
  title: string;
  sections: { heading: string; body: string[] }[];
}>;

/** Puts the document straight onto the wire, dropping the read-only markers. */
function toWire(doc: FrozenDocument): DeepMutable<FrozenDocument> {
  return {
    title: doc.title,
    sections: doc.sections.map((section) => ({
      heading: section.heading,
      body: [...section.body],
    })),
  };
}

const frozen: FrozenDocument = {
  title: "Recursive types",
  sections: [{ heading: "Intro", body: ["one", "two"] }],
};
console.log("example 4:", JSON.stringify(toWire(frozen)));
