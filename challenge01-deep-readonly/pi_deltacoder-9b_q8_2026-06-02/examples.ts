import {
  DeepReadonly,
  DeepMutable,
  DeepPartial,
  DeepRequired,
  DeepPick,
} from "./types";

// ============================================================================
// Example 1: Immutable Redux State Management
// ============================================================================

/**
 * Redux state is typically frozen/immutable. Using DeepReadonly ensures
 * that state snapshots can be safely copied without accidental mutations.
 */

interface UserState {
  users: {
    id: number;
    name: string;
    email: string;
    preferences: {
      notifications: boolean;
      theme: "light" | "dark";
      language: string;
    };
    metadata: Map<string, string>;
  }[];
  currentUser?: {
    id: number;
    lastLogin: Date;
  };
  settings: {
    app: {
      notifications: boolean;
      theme: "light" | "dark";
    };
    analytics: {
      enabled: boolean;
      anonymize: boolean;
    };
  };
}

// In Redux, state is often frozen, but we can use DeepReadonly for type safety
type ReadonlyUserState = DeepReadonly<UserState>;

function createUserInitialState(): ReadonlyUserState {
  return {
    users: [
      {
        id: 1,
        name: "Alice",
        email: "alice@example.com",
        preferences: {
          notifications: true,
          theme: "dark",
          language: "en",
        },
        metadata: new Map([["createdAt", "2024-01-01"]]),
      },
    ],
    settings: {
      app: {
        notifications: true,
        theme: "dark",
      },
      analytics: {
        enabled: true,
        anonymize: false,
      },
    },
  };
}

// In Redux reducers, we often return new objects
function selectUsers(state: ReadonlyUserState): UserState["users"] {
  return state.users;
}

function updateUser(state: ReadonlyUserState, userId: number): UserState {
  // Create a new state with the updated user
  return {
    ...state,
    users: state.users.map((user) =>
      user.id === userId
        ? {
            ...user,
            name: "Updated Name",
          }
        : user,
    ),
  };
}

// ============================================================================
// Example 2: Configuration Objects
// ============================================================================

/**
 * Configuration objects are often read-only after initial setup.
 * DeepReadonly ensures configuration cannot be accidentally modified.
 */

interface AppConfig {
  server: {
    host: string;
    port: number;
    timeout: number;
    ssl: {
      enabled: boolean;
      certPath: string;
      keyPath: string;
    };
    retries: {
      maxAttempts: number;
      backoffMs: number;
    };
  };
  database: {
    connection: {
      host: string;
      port: number;
      name: string;
    };
    pool: {
      minSize: number;
      maxSize: number;
    };
  };
  cache: {
    ttl: number;
    enabled: boolean;
    provider: "redis" | "memcached" | "local";
  };
  features: {
    beta: boolean;
    experimental: boolean;
  };
}

type ReadonlyAppConfig = DeepReadonly<AppConfig>;

const DEFAULT_CONFIG: ReadonlyAppConfig = {
  server: {
    host: "localhost",
    port: 3000,
    timeout: 5000,
    ssl: {
      enabled: false,
      certPath: "/etc/ssl/cert.pem",
      keyPath: "/etc/ssl/key.pem",
    },
    retries: {
      maxAttempts: 3,
      backoffMs: 1000,
    },
  },
  database: {
    connection: {
      host: "localhost",
      port: 5432,
      name: "myapp",
    },
    pool: {
      minSize: 2,
      maxSize: 10,
    },
  },
  cache: {
    ttl: 3600,
    enabled: true,
    provider: "redis",
  },
  features: {
    beta: false,
    experimental: false,
  },
};

// Configuration validation - config should never change after loading
function validateConfig(config: ReadonlyAppConfig): boolean {
  return config.server.port > 0 && config.server.port < 65536;
}

// Partial config for overrides during development
type PartialAppConfig = DeepPartial<ReadonlyAppConfig>;

function createDevConfig(): PartialAppConfig {
  return {
    server: {
      port: 3001,
    },
    database: {
      connection: {
        name: "dev_db",
      },
    },
    features: {
      beta: true,
      experimental: true,
    },
  };
}

// ============================================================================
// Example 3: API Response Types
// ============================================================================

/**
 * API responses should be treated as immutable. DeepReadonly ensures
 * response data cannot be mutated accidentally.
 */

interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: number;
    requestId: string;
    version: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface User {
  id: number;
  username: string;
  email: string;
  profile: {
    avatar: string;
    bio: string;
    location: {
      country: string;
      city: string;
    };
    socials: Map<string, string>;
  };
  relationships: {
    followers: number;
    following: number;
    followingList: string[];
  };
  settings: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    privacy: {
      visible: boolean;
      searchable: boolean;
    };
  };
}

type ReadonlyApiResponse<T> = DeepReadonly<ApiResponse<T>>;

const mockUserResponse: ReadonlyApiResponse<User> = {
  data: {
    id: 1,
    username: "johndoe",
    email: "john@example.com",
    profile: {
      avatar: "https://example.com/avatar.jpg",
      bio: "Developer",
      location: {
        country: "USA",
        city: "New York",
      },
      socials: new Map([["twitter", "@johndoe"]]),
    },
    relationships: {
      followers: 150,
      following: 50,
      followingList: ["alice", "bob"],
    },
    settings: {
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      privacy: {
        visible: true,
        searchable: true,
      },
    },
  },
  meta: {
    timestamp: Date.now(),
    requestId: "req_123",
    version: "1.0.0",
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 100,
    totalPages: 10,
  },
};

// Extracting specific fields using DeepPick
type UserCountry = DeepPick<User, "profile.location.country">;

const getUserCountry = (user: User): UserCountry => {
  return user.profile.location.country;
};

// ============================================================================
// Example 4: Form State Management
// ============================================================================

/**
 * Form state can be deeply nested. DeepPartial allows partial updates
 * while maintaining type safety.
 */

interface FormState {
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  preferences: {
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    privacy: {
      shareData: boolean;
      analytics: boolean;
    };
  };
  company?: {
    name: string;
    industry: string;
    size: number;
  };
}

type PartialFormState = DeepPartial<FormState>;

interface FormValues extends FormState {}

const initialFormState: PartialFormState = {
  personal: {
    firstName: "",
    lastName: "",
    email: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
    },
  },
  preferences: {
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
    privacy: {
      shareData: false,
      analytics: true,
    },
  },
};

function updatePersonalInfo(
  state: PartialFormState,
  firstName: string,
  lastName: string,
): PartialFormState {
  return {
    ...state,
    personal: {
      ...state.personal,
      firstName,
      lastName,
    },
  };
}

function updatePreferences(
  state: PartialFormState,
  notifications: PartialFormState["preferences"]["notifications"],
): PartialFormState {
  return {
    ...state,
    preferences: {
      ...state.preferences,
      notifications,
    },
  };
}

// ============================================================================
// Example 5: DeepRequired for Required Fields
// ============================================================================

/**
 * When loading from optional/nullable sources, DeepRequired can
 * ensure all fields are populated.
 */

interface NullableUserData {
  id?: number;
  username?: string;
  email?: string;
  profile?: {
    avatar?: string;
    bio?: string;
    location?: {
      country?: string;
      city?: string;
    };
  };
}

type RequiredUserData = DeepRequired<NullableUserData>;

function ensureRequiredData(data: NullableUserData): RequiredUserData {
  // In real implementation, this would validate/fetch missing data
  // For demonstration, we just return the data (would fail at runtime if incomplete)
  return data as RequiredUserData;
}

// ============================================================================
// Example 6: DeepPick for Selecting Specific Fields
// ============================================================================

type UserCountryInfo = DeepPick<
  User,
  "profile.location.country"
>;

const getContactInfo = (user: User): UserCountryInfo => {
  return user.profile.location.country;
};

type UserStats = DeepPick<
  User,
  "relationships.followers" | "relationships.following"
>;

const getUserStats = (user: User): UserStats => {
  return {
    "relationships.followers": user.relationships.followers,
    "relationships.following": user.relationships.following,
  };
};

// ============================================================================
// Example 7: Combined - Making API responses mutable for processing
// ============================================================================

type MutableApiResponse<T> = DeepMutable<ApiResponse<T>>;

function processApiResponse(response: ReadonlyApiResponse<User>): MutableApiResponse<User> {
  const mutable = { ...response } as MutableApiResponse<User>;
  mutable.meta.timestamp = Date.now();
  return mutable;
}
