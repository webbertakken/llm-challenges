import { DeepReadonly, DeepPartial, DeepPick } from "./types.js";

/**
 * Example 1: Immutable Redux-like State
 */
interface UserState {
  id: string;
  profile: {
    name: string;
    avatarUrl: string | null;
    preferences: {
      theme: "light" | "dark";
      notifications: boolean;
    };
  };
  posts: Array<{
    id: string;
    content: string;
    tags: string[];
  }>;
}

type ImmutableUserState = DeepReadonly<UserState>;

const state: ImmutableUserState = {
  id: "user_1",
  profile: {
    name: "Alice",
    avatarUrl: null,
    preferences: {
      theme: "dark",
      notifications: true,
    },
  },
  posts: [
    { id: "post_1", content: "Hello world", tags: ["intro", "first"] },
  ],
};

// @ts-expect-error - Cannot modify nested property
state.profile.preferences.theme = "light";
// @ts-expect-error - Cannot push to nested array
state.posts[0].tags.push("new-tag");

/**
 * Example 2: Partial Configuration Updates
 */
interface AppConfig {
  api: {
    endpoint: string;
    timeout: number;
    retries: number;
  };
  features: {
    enableBeta: boolean;
    debugMode: boolean;
  };
}

type ConfigPatch = DeepPartial<AppConfig>;

function updateConfig(current: AppConfig, patch: ConfigPatch): AppConfig {
  // Real implementation would merge objects recursively
  return { ...current, ...patch } as AppConfig;
}

const patch: ConfigPatch = {
  api: {
    timeout: 5000,
  },
};

/**
 * Example 3: Selective API Data Fetching (DeepPick)
 */
interface Product {
  id: string;
  meta: {
    sku: string;
    manufacturer: {
      name: string;
      country: string;
    };
  };
  pricing: {
    basePrice: number;
    currency: string;
    discounts: Array<{
      code: string;
      percentage: number;
    }>;
  };
}

// Suppose we only need the product ID and the manufacturer name for a list view
type ProductListItem = DeepPick<Product, "id" | "meta.manufacturer.name">;

const listItem: ProductListItem = {
  id: "prod_99",
  meta: {
    manufacturer: {
      name: "TechCorp",
    },
  },
};

console.log("Examples loaded successfully!");
