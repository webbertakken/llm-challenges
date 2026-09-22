/**
 * Challenge 01 — Real-world Usage Examples
 */

import type {
  DeepReadonly,
  DeepMutable,
  DeepPartial,
  DeepRequired,
  DeepPick,
} from "./types.js";

// ==========================================
// Example 1: Immutable Redux State Management
// ==========================================

export interface UserProfile {
  id: string;
  name: string;
  preferences: {
    theme: "light" | "dark";
    notifications: {
      email: boolean;
      push: boolean;
    };
    tags: string[];
  };
  metadata: Map<string, string>;
}

export interface AppState {
  user: UserProfile;
  sessionToken: string | null;
  cachedFeed: {
    items: Array<{ id: number; title: string }>;
  };
}

// Ensure the Redux state is deeply immutable to prevent accidental mutation in reducers/selectors
export type ImmutableAppState = DeepReadonly<AppState>;

export function createInitialState(): ImmutableAppState {
  const initial: AppState = {
    user: {
      id: "u123",
      name: "Alice",
      preferences: {
        theme: "dark",
        notifications: {
          email: true,
          push: false,
        },
        tags: ["admin", "developer"],
      },
      metadata: new Map([["role", "lead"]]),
    },
    sessionToken: "abc-123-xyz",
    cachedFeed: {
      items: [{ id: 1, title: "Welcome to the App" }],
    },
  };
  return initial as ImmutableAppState;
}

// ==========================================
// Example 2: Deep Application Config & Overrides
// ==========================================

export interface DatabaseConfig {
  host: string;
  port: number;
  credentials: {
    username: string;
    secret: {
      key: string;
      rotatedAt: Date;
    };
  };
  pool: {
    min: number;
    max: number;
  };
}

export interface ServerConfig {
  database: DatabaseConfig;
  logging: {
    level: "debug" | "info" | "warn" | "error";
    destinations: string[];
  };
}

// In deep configuration merging, user overrides can specify any partial subset of the config tree
export type ServerConfigPatch = DeepPartial<ServerConfig>;

// Full default configuration requires all nested values
export type CompleteServerConfig = DeepRequired<ServerConfig>;

export function applyConfigPatch(
  base: CompleteServerConfig,
  _patch: ServerConfigPatch
): CompleteServerConfig {
  // Deep merge simulation
  return base;
}

// ==========================================
// Example 3: Selective API Response Types (GraphQL / Sparse Fieldsets)
// ==========================================

export interface ECommerceProduct {
  id: string;
  sku: string;
  details: {
    title: string;
    description: string;
    pricing: {
      amount: number;
      currency: string;
      discount?: {
        percentage: number;
        expiresAt: string;
      };
    };
    dimensions: {
      width: number;
      height: number;
      depth: number;
    };
  };
  inventory: {
    warehouseId: string;
    inStock: number;
  };
}

// Pick only the fields needed for a lightweight product card in a catalog listing
export type ProductCardSummary = DeepPick<
  ECommerceProduct,
  "id" | "details.title" | "details.pricing.amount" | "details.pricing.currency"
>;

export const exampleCard: ProductCardSummary = {
  id: "prod_001",
  details: {
    title: "Ergonomic Mechanical Keyboard",
    pricing: {
      amount: 149.99,
      currency: "USD",
    },
  },
};
