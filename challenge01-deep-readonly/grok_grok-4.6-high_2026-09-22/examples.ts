import type {
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types.ts";

// ---------------------------------------------------------------------------
// 1. Immutable Redux-style application state
// ---------------------------------------------------------------------------

interface User {
  id: string;
  name: string;
  tags: string[];
}

interface Session {
  token: string;
  expiresAt: Date;
}

interface AppState {
  users: Map<string, User>;
  session: Session | null;
  flags: Set<string>;
  route: [page: string, params: Record<string, string>];
}

type ImmutableState = DeepReadonly<AppState>;

function selectUser(
  state: ImmutableState,
  id: string,
): DeepReadonly<User> | undefined {
  return state.users.get(id);
}

function reducer(state: ImmutableState, user: User): ImmutableState {
  const users = new Map(state.users);
  users.set(user.id, user);
  const next: AppState = {
    users,
    session: state.session === null ? null : { ...state.session },
    flags: new Set(state.flags),
    route: [state.route[0], { ...state.route[1] }],
  };
  return next as ImmutableState;
}

// Draft updates use the mutable inverse, then freeze back into state.
type DraftState = DeepMutable<ImmutableState>;

function produce(state: ImmutableState, recipe: (draft: DraftState) => void): ImmutableState {
  const draft: DraftState = {
    users: new Map(state.users),
    session: state.session === null ? null : { ...state.session },
    flags: new Set(state.flags),
    route: [state.route[0], { ...state.route[1] }],
  };
  recipe(draft);
  return draft;
}

// ---------------------------------------------------------------------------
// 2. Deeply nested configuration with overlays
// ---------------------------------------------------------------------------

interface DatabaseConfig {
  host: string;
  port: number;
  ssl: { enabled: boolean; ca?: string };
}

interface ServiceConfig {
  name: string;
  database: DatabaseConfig;
  retries: [initialMs: number, maxMs: number];
}

interface AppConfig {
  env: "dev" | "prod";
  services: Record<string, ServiceConfig>;
}

type ConfigPatch = DeepPartial<AppConfig>;

const defaults: AppConfig = {
  env: "dev",
  services: {
    api: {
      name: "api",
      database: { host: "localhost", port: 5432, ssl: { enabled: false } },
      retries: [100, 2000],
    },
  },
};

function applyPatch(base: AppConfig, patch: ConfigPatch): AppConfig {
  return {
    env: patch.env ?? base.env,
    services: {
      ...base.services,
      ...Object.fromEntries(
        Object.entries(patch.services ?? {}).map(([key, value]) => {
          const current = base.services[key];
          return [
            key,
            {
              name: value?.name ?? current?.name ?? key,
              database: {
                host: value?.database?.host ?? current?.database.host ?? "localhost",
                port: value?.database?.port ?? current?.database.port ?? 5432,
                ssl: {
                  enabled:
                    value?.database?.ssl?.enabled ??
                    current?.database.ssl.enabled ??
                    false,
                  ca: value?.database?.ssl?.ca ?? current?.database.ssl.ca,
                },
              },
              retries: value?.retries ?? current?.retries ?? [100, 2000],
            } satisfies ServiceConfig,
          ];
        }),
      ),
    },
  };
}

const productionOverlay: ConfigPatch = {
  env: "prod",
  services: { api: { database: { ssl: { enabled: true } } } },
};

const production = applyPatch(defaults, productionOverlay);

// After validation, a parsed config with optional fields becomes fully required.
type ParsedConfig = DeepRequired<ConfigPatch>;

function requireConfig(patch: ConfigPatch): ParsedConfig {
  const applied = applyPatch(defaults, patch);
  return applied as ParsedConfig;
}

// ---------------------------------------------------------------------------
// 3. API response projection (GraphQL-style field picking)
// ---------------------------------------------------------------------------

interface ApiUser {
  id: string;
  email: string;
  profile: {
    displayName: string;
    avatarUrl: string;
    bio: string;
  };
  billing: {
    plan: "free" | "pro";
    invoices: { id: string; cents: number }[];
  };
}

type PublicUser = DeepPick<ApiUser, "id" | "profile.displayName" | "profile.avatarUrl">;
type BillingSummary = DeepPick<ApiUser, "id" | "billing.plan">;

function toPublicUser(user: ApiUser): PublicUser {
  return {
    id: user.id,
    profile: {
      displayName: user.profile.displayName,
      avatarUrl: user.profile.avatarUrl,
    },
  };
}

function toBillingSummary(user: ApiUser): BillingSummary {
  return {
    id: user.id,
    billing: { plan: user.billing.plan },
  };
}

export {
  applyPatch,
  produce,
  reducer,
  requireConfig,
  selectUser,
  toBillingSummary,
  toPublicUser,
};
export type {
  AppConfig,
  AppState,
  BillingSummary,
  ConfigPatch,
  DraftState,
  ImmutableState,
  ParsedConfig,
  PublicUser,
};

void production;
void defaults;
