import type {
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types.js";

type ReduxState = {
  session: {
    user: {
      id: string;
      roles: string[];
    };
    featureFlags: Map<string, { enabled: boolean }>;
  };
  auditTrail: Array<{
    at: string;
    action: string;
  }>;
};

type ImmutableReduxState = DeepReadonly<ReduxState>;

const reduxSnapshot: ImmutableReduxState = {
  session: {
    user: {
      id: "u_123",
      roles: ["admin"],
    },
    featureFlags: new Map([["beta-dashboard", { enabled: true }]]),
  },
  auditTrail: [{ at: "2026-06-02T12:00:00Z", action: "login" }],
};

type DeploymentConfig = {
  app: {
    name: string;
    ports: [http: number, https?: number];
    env: Record<string, string>;
  };
  integrations: {
    slack?: {
      webhookUrl?: string;
      channel?: string;
    };
  };
};

type PatchableConfig = DeepPartial<DeploymentConfig>;
type CompleteConfig = DeepRequired<PatchableConfig>;

const configPatch: PatchableConfig = {
  integrations: {
    slack: {
      channel: "#deployments",
    },
  },
};

const fullConfig: CompleteConfig = {
  app: {
    name: "orders-api",
    ports: [8080, 8443],
    env: {
      NODE_ENV: "production",
    },
  },
  integrations: {
    slack: {
      webhookUrl: "https://hooks.slack.invalid/services/example",
      channel: "#deployments",
    },
  },
};

type ApiResponse = {
  data: {
    account: {
      id: string;
      profile: {
        email: string;
        marketing: {
          subscribed: boolean;
        };
      };
    };
  };
  included: ReadonlySet<{
    type: string;
    id: string;
  }>;
};

type AccountPreview = DeepPick<
  ApiResponse,
  "data.account.id" | "data.account.profile.email"
>;

type EditableAccountPreview = DeepMutable<DeepReadonly<AccountPreview>>;

const accountPreview: EditableAccountPreview = {
  data: {
    account: {
      id: "acct_42",
      profile: {
        email: "owner@example.com",
      },
    },
  },
};

void reduxSnapshot;
void configPatch;
void fullConfig;
void accountPreview;
