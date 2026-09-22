import { DeepReadonly, DeepMutable, DeepPartial, DeepPick } from "./types.js";

// Example 1: Immutable Redux State
type RootState = {
  user: {
    id: string;
    profile: {
      name: string;
      email: string;
    };
    settings: Map<string, boolean>;
  };
  posts: {
    id: string;
    title: string;
    comments: { id: string; text: string }[];
  }[];
};

export const initialState: DeepReadonly<RootState> = {
  user: {
    id: "1",
    profile: {
      name: "Alice",
      email: "alice@example.com",
    },
    settings: new Map([["darkMode", true]]),
  },
  posts: [
    {
      id: "p1",
      title: "Hello World",
      comments: [{ id: "c1", text: "Nice post!" }],
    },
  ],
};

// Example 2: Config Objects
type AppConfig = {
  db: {
    host: string;
    port: number;
  };
  api: {
    endpoints: string[];
    rateLimit: {
      requests: number;
      windowMs: number;
    };
  };
};

export function updateConfig(updates: DeepPartial<AppConfig>) {
  // Merge updates deeply into the config
  return updates;
}

// Example 3: API Response Picking
type ApiResponse = {
  data: {
    user: {
      id: string;
      name: string;
      avatarUrl: string;
    };
    organization: {
      id: string;
      name: string;
      billing: {
        plan: string;
        status: string;
      };
    };
  };
  meta: {
    timestamp: number;
    requestId: string;
  };
};

// A component that only needs specific parts of the response
type ComponentData = DeepPick<ApiResponse, "data.user" | "meta.timestamp">;

export function renderUserComponent(data: ComponentData) {
  console.log(`Rendering for user ${data.data.user.name} at ${data.meta.timestamp}`);
}
