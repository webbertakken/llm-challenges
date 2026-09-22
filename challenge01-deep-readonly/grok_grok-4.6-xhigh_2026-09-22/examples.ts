import type {
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types.ts";

// ---------------------------------------------------------------------------
// 1. Immutable Redux-style state
// ---------------------------------------------------------------------------

type CartItem = {
  sku: string;
  qty: number;
  tags: string[];
};

type AppState = {
  user: {
    id: string;
    roles: string[];
    profile: { displayName: string; email: string };
  };
  cart: {
    items: CartItem[];
    coupons: Set<string>;
    meta: Map<string, { applied: boolean }>;
  };
};

type ImmutableState = DeepReadonly<AppState>;

const initialState: ImmutableState = {
  user: {
    id: "u-1",
    roles: ["member"],
    profile: { displayName: "Ada", email: "ada@example.com" },
  },
  cart: {
    items: [{ sku: "book", qty: 1, tags: ["gift"] }],
    coupons: new Set(["WELCOME"]),
    meta: new Map([["WELCOME", { applied: true }]]),
  },
};

function selectDisplayName(state: ImmutableState): string {
  return state.user.profile.displayName;
}

type DraftState = DeepMutable<ImmutableState>;

function addItem(state: ImmutableState, item: CartItem): ImmutableState {
  const draft: DraftState = {
    user: {
      id: state.user.id,
      roles: [...state.user.roles],
      profile: { ...state.user.profile },
    },
    cart: {
      items: [...state.cart.items, item],
      coupons: new Set(state.cart.coupons),
      meta: new Map(state.cart.meta),
    },
  };
  return draft;
}

const afterAdd = addItem(initialState, { sku: "pen", qty: 2, tags: [] });

// ---------------------------------------------------------------------------
// 2. Layered configuration objects
// ---------------------------------------------------------------------------

type AppConfig = {
  server: {
    host: string;
    port: number;
    tls: { cert: string; key: string };
  };
  features: {
    flags: Map<string, boolean>;
    limits: { maxSockets: number; timeouts: [number, number] };
  };
};

type ConfigOverride = DeepPartial<AppConfig>;

const production: AppConfig = {
  server: {
    host: "0.0.0.0",
    port: 443,
    tls: { cert: "/etc/certs/fullchain.pem", key: "/etc/certs/privkey.pem" },
  },
  features: {
    flags: new Map([["beta", false]]),
    limits: { maxSockets: 1024, timeouts: [5_000, 30_000] },
  },
};

const localOverride: ConfigOverride = {
  server: { port: 3000 },
  features: { flags: new Map([["beta", true]]) },
};

function mergeConfig(base: AppConfig, override: ConfigOverride): AppConfig {
  return {
    server: {
      host: override.server?.host ?? base.server.host,
      port: override.server?.port ?? base.server.port,
      tls: {
        cert: override.server?.tls?.cert ?? base.server.tls.cert,
        key: override.server?.tls?.key ?? base.server.tls.key,
      },
    },
    features: {
      flags: override.features?.flags ?? base.features.flags,
      limits: {
        maxSockets: override.features?.limits?.maxSockets ?? base.features.limits.maxSockets,
        timeouts: override.features?.limits?.timeouts ?? base.features.limits.timeouts,
      },
    },
  };
}

const localConfig = mergeConfig(production, localOverride);

// ---------------------------------------------------------------------------
// 3. API response types: patch input vs required payload
// ---------------------------------------------------------------------------

type UserResponse = {
  id: string;
  profile?: {
    name?: string;
    address?: { city?: string; zip?: number };
  };
  settings?: { newsletter?: boolean; theme?: "light" | "dark" };
};

type StoredUser = DeepRequired<UserResponse>;

const stored: StoredUser = {
  id: "u-1",
  profile: {
    name: "Ada Lovelace",
    address: { city: "London", zip: 0 },
  },
  settings: { newsletter: true, theme: "dark" },
};

type UserPatch = DeepPartial<StoredUser>;

function applyPatch(user: StoredUser, patch: UserPatch): StoredUser {
  return {
    id: patch.id ?? user.id,
    profile: {
      name: patch.profile?.name ?? user.profile.name,
      address: {
        city: patch.profile?.address?.city ?? user.profile.address.city,
        zip: patch.profile?.address?.zip ?? user.profile.address.zip,
      },
    },
    settings: {
      newsletter: patch.settings?.newsletter ?? user.settings.newsletter,
      theme: patch.settings?.theme ?? user.settings.theme,
    },
  };
}

type PublicUser = DeepPick<StoredUser, "id" | "profile.name" | "profile.address.city">;

function toPublic(user: StoredUser): PublicUser {
  return {
    id: user.id,
    profile: {
      name: user.profile.name,
      address: { city: user.profile.address.city },
    },
  };
}

const patched = applyPatch(stored, { profile: { address: { city: "Cambridge" } } });
const publicUser = toPublic(patched);

export {
  addItem,
  afterAdd,
  applyPatch,
  initialState,
  localConfig,
  mergeConfig,
  publicUser,
  selectDisplayName,
  stored,
  toPublic,
};
