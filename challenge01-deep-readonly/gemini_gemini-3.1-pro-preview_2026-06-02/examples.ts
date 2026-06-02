import { DeepReadonly, DeepPartial, DeepPick } from "./types.js";

// Example 1: Immutable Redux State
// When defining a global application state, we often want to ensure that 
// reducers and selectors cannot accidentally mutate the state. DeepReadonly
// guarantees that even nested objects and arrays are locked down.
type AppState = {
  user: {
    id: string;
    permissions: string[];
  };
  settings: Map<string, boolean>;
};
export type ReadonlyAppState = DeepReadonly<AppState>;

const state: ReadonlyAppState = {
  user: { id: "123", permissions: ["admin"] },
  settings: new Map([["darkMode", true]])
};
// state.user.permissions.push("editor") // would throw a compiler error


// Example 2: API Response Types with Partial Updates
// When handling a PATCH request in an API, the incoming payload might
// contain any deeply nested subset of the full resource model. DeepPartial
// allows us to safely type the incoming body while maintaining structure.
type UserProfile = {
  profile: {
    bio: string;
    avatarUrl: string;
  };
  preferences: {
    notifications: {
      email: boolean;
      sms: boolean;
    };
  };
};
export type UpdateProfilePayload = DeepPartial<UserProfile>;

const update: UpdateProfilePayload = {
  preferences: {
    notifications: { email: false }
  }
};


// Example 3: GraphQL-like Selective Queries
// When implementing a generic data-fetching layer, we may want to 
// extract exact paths from a large response object based on user requirements.
// DeepPick helps infer the exact structure of the returned slice.
type MasterConfig = {
  system: {
    retries: number;
    timeout: number;
  };
  features: {
    newDashboard: boolean;
    betaAccess: boolean;
  };
  database: {
    host: string;
    port: number;
  };
};
export type PickedConfig = DeepPick<MasterConfig, "system.timeout" | "features">;

const configSlice: PickedConfig = {
  system: { timeout: 5000 },
  features: { newDashboard: true, betaAccess: false }
};

// Note on limitations: 
// The recursive utility types gracefully handle built-in primitives and Map/Set/Promises.
// However, infinite circular references in custom object types (e.g. A has B, B has A)
// could hit TypeScript's maximum instantiation depth during deep type resolution.
