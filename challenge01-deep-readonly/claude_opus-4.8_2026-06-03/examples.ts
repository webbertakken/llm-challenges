/**
 * Real-world usage examples for the deep utility types.
 *
 * Unlike `tests.ts`, this file contains actual runtime code so the types are
 * exercised in realistic scenarios. It still type-checks under
 * `tsc --noEmit --strict`.
 */

import type {
  DeepReadonly,
  DeepMutable,
  DeepPartial,
  DeepRequired,
  DeepPick,
} from "./types.ts";

/* ========================================================================== */
/* Example 1 — Immutable Redux-style application state                        */
/* ========================================================================== */

interface AppState {
  user: {
    id: string;
    profile: {
      name: string;
      roles: string[];
    };
  };
  session: {
    permissions: Set<string>;
    flags: Map<string, boolean>;
  };
}

/** The store hands out a frozen, deeply-immutable snapshot to consumers. */
type ImmutableState = DeepReadonly<AppState>;

function selectUserName(state: ImmutableState): string {
  // Reads are fine at any depth.
  return state.user.profile.name;
}

function canRead(state: ImmutableState): boolean {
  return state.session.permissions.has("read");
}

// A reducer works on a mutable draft, then publishes an immutable snapshot.
function makeSnapshot(draft: AppState): ImmutableState {
  return draft;
}

const liveDraft: AppState = {
  user: { id: "u1", profile: { name: "Ada", roles: ["admin"] } },
  session: { permissions: new Set(["read", "write"]), flags: new Map() },
};
export const snapshot: ImmutableState = makeSnapshot(liveDraft);
export const currentUser = selectUserName(snapshot);
export const readable = canRead(snapshot);

// Were the next lines uncommented, the compiler would reject them — the
// snapshot is deeply readonly:
//   snapshot.user.profile.name = "Mallory";   // readonly property
//   snapshot.user.profile.roles.push("root"); // readonly array
//   snapshot.session.flags.set("beta", true);  // ReadonlyMap has no `set`

/* ========================================================================== */
/* Example 2 — Config objects: defaults + deep partial overrides             */
/* ========================================================================== */

interface ServerConfig {
  host: string;
  port: number;
  tls: {
    enabled: boolean;
    cert: {
      path: string;
      passphrase: string;
    };
  };
  cache: {
    ttlSeconds: number;
    maxEntries: number;
  };
}

const DEFAULT_CONFIG: ServerConfig = {
  host: "0.0.0.0",
  port: 8080,
  tls: {
    enabled: false,
    cert: { path: "", passphrase: "" },
  },
  cache: { ttlSeconds: 60, maxEntries: 1000 },
};

/** Callers may override any subset, at any depth. */
function withOverrides(overrides: DeepPartial<ServerConfig>): ServerConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    tls: {
      ...DEFAULT_CONFIG.tls,
      ...overrides.tls,
      cert: { ...DEFAULT_CONFIG.tls.cert, ...overrides.tls?.cert },
    },
    cache: { ...DEFAULT_CONFIG.cache, ...overrides.cache },
  };
}

// Only the fields we care about — the rest fall back to defaults.
export const prodConfig = withOverrides({
  port: 443,
  tls: { enabled: true, cert: { path: "/etc/ssl/prod.pem" } },
});

/* ========================================================================== */
/* Example 3 — Trimming API response types with DeepPick                      */
/* ========================================================================== */

interface UserApiResponse {
  id: string;
  email: string;
  profile: {
    displayName: string;
    avatarUrl: string;
    address: {
      city: string;
      country: string;
      postcode: string;
    };
  };
  audit: {
    createdAt: string;
    updatedAt: string;
  };
}

/** A list view only needs a name, a city and a country. */
type UserListItem = DeepPick<
  UserApiResponse,
  "id" | "profile.displayName" | "profile.address.city" | "profile.address.country"
>;

function toListItem(res: UserApiResponse): UserListItem {
  return {
    id: res.id,
    profile: {
      displayName: res.profile.displayName,
      address: {
        city: res.profile.address.city,
        country: res.profile.address.country,
      },
    },
  };
}

export const listItem = toListItem({
  id: "42",
  email: "ada@example.com",
  profile: {
    displayName: "Ada Lovelace",
    avatarUrl: "https://example.com/ada.png",
    address: { city: "London", country: "UK", postcode: "EC1" },
  },
  audit: { createdAt: "2026-01-01", updatedAt: "2026-06-01" },
});

/* ========================================================================== */
/* Example 4 — DeepRequired to validate a fully-populated config              */
/* ========================================================================== */

interface FormDraft {
  contact?: {
    name?: string;
    email?: string;
  };
  preferences?: {
    newsletter?: boolean;
  };
}

/** After validation the draft is guaranteed complete at every level. */
type ValidatedForm = DeepRequired<FormDraft>;

function validate(draft: FormDraft): ValidatedForm | null {
  if (
    draft.contact?.name &&
    draft.contact.email &&
    draft.preferences?.newsletter !== undefined
  ) {
    return {
      contact: { name: draft.contact.name, email: draft.contact.email },
      preferences: { newsletter: draft.preferences.newsletter },
    };
  }
  return null;
}

export const validated = validate({
  contact: { name: "Grace", email: "grace@example.com" },
  preferences: { newsletter: true },
});

/* ========================================================================== */
/* Example 5 — DeepMutable for an editable draft of a frozen entity           */
/* ========================================================================== */

type FrozenDocument = DeepReadonly<{
  title: string;
  tags: string[];
  meta: { revision: number };
}>;

/** Turn a frozen document back into an editable working copy. */
type DraftDocument = DeepMutable<FrozenDocument>;

function edit(doc: FrozenDocument): DraftDocument {
  // Structural clone so we never mutate the frozen source.
  return {
    title: doc.title,
    tags: [...doc.tags],
    meta: { revision: doc.meta.revision },
  };
}

const frozen: FrozenDocument = {
  title: "Spec",
  tags: ["draft"],
  meta: { revision: 1 },
};

export const draft = edit(frozen);
// The working copy is freely mutable again:
draft.title = "Spec v2";
draft.tags.push("reviewed");
draft.meta.revision += 1;
