import type {
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types";

type ReduxState = {
  session: {
    user: {
      id: string;
      roles: string[];
    };
    flags: Map<string, { enabled: boolean }>;
  };
  history: [{ route: string }, { route: string }];
};

export type ImmutableReduxState = DeepReadonly<ReduxState>;

export function readCurrentUserId(state: ImmutableReduxState): string {
  return state.session.user.id;
}

type AppConfig = {
  server: {
    host: string;
    port: number;
    tls: {
      enabled: boolean;
      certificatePath: string;
    };
  };
  integrations: {
    analytics: {
      token: string;
      sampleRate: number;
    };
  };
};

export type ConfigOverride = DeepPartial<AppConfig>;
export type CompleteConfig = DeepRequired<ConfigOverride>;

export const localOverride: ConfigOverride = {
  server: {
    tls: { enabled: false },
  },
};

type ApiResponse = {
  data: {
    account: {
      id: string;
      email: string;
      profile: {
        displayName: string;
        avatarUrl: string;
      };
    };
    billing: {
      plan: string;
      invoices: { id: string; totalCents: number }[];
    };
  };
  meta: {
    requestId: string;
  };
};

export type AccountCardPayload = DeepPick<
  ApiResponse,
  "data.account.id" | "data.account.profile.displayName" | "meta.requestId"
>;

export function accountCardTitle(payload: AccountCardPayload): string {
  return `${payload.data.account.profile.displayName} (${payload.data.account.id})`;
}

type GeneratedReadonlyModel = DeepReadonly<{
  id: string;
  tags: readonly string[];
  metadata: ReadonlyMap<string, { value: string }>;
}>;

export type EditableGeneratedModel = DeepMutable<GeneratedReadonlyModel>;

export const editableModel: EditableGeneratedModel = {
  id: "model_123",
  tags: ["draft"],
  metadata: new Map([["source", { value: "import" }]]),
};

editableModel.tags.push("reviewed");

type CircularNode = {
  id: string;
  next?: CircularNode;
};

export type ReadonlyCircularNode = DeepReadonly<CircularNode>;

export const circularReferenceLimitation =
  "Recursive utility types can describe circular shapes, but TypeScript has finite instantiation depth and may stop on very large recursive graphs.";

