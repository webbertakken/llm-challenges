// ─────────────────────────────────────────────
// Challenge 01 — Real-world usage examples
// ─────────────────────────────────────────────

import type { DeepReadonly, DeepMutable, DeepPartial, DeepRequired, DeepPick } from "./types.ts";

// ─────────────────────────────────────────────
// Example 1: Immutable Redux State
// ─────────────────────────────────────────────

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  tags: string[];
}

interface AppState {
  todos: Todo[];
  ui: {
    theme: "light" | "dark";
    sidebar: {
      collapsed: boolean;
      width: number;
    };
  };
  user: {
    name: string;
    preferences: {
      notifications: {
        email: boolean;
        push: boolean;
      };
      language: string;
    };
  } | null;
}

// Redux selectors receive readonly state — DeepReadonly guarantees immutability
type ImmutableState = DeepReadonly<AppState>;

function getCompletedCount(state: ImmutableState): number {
  return state.todos.filter((t: ImmutableState["todos"][number]) => t.completed).length;
}

function getSidebarWidth(state: ImmutableState): number {
  return state.ui.sidebar.width;
}

// ❌ Cannot mutate — caught at compile time
function badMutation(state: ImmutableState) {
  // @ts-expect-error — sidebar.collapsed is readonly
  state.ui.sidebar.collapsed = true;
}

// ─────────────────────────────────────────────
// Example 2: Config Object with Defaults Merging
// ─────────────────────────────────────────────

interface ServerConfig {
  host: string;
  port: number;
  ssl: {
    enabled: boolean;
    certPath: string;
    keyPath: string;
  };
  database: {
    url: string;
    pool: {
      min: number;
      max: number;
      idleTimeout: number;
    };
    retries: {
      count: number;
      backoff: "linear" | "exponential";
    };
  };
  logging: {
    level: "debug" | "info" | "warn" | "error";
    outputs: {
      console: boolean;
      file: { enabled: boolean; path: string };
    };
  };
}

const defaultConfig: ServerConfig = {
  host: "0.0.0.0",
  port: 3000,
  ssl: { enabled: false, certPath: "", keyPath: "" },
  database: {
    url: "postgres://localhost/db",
    pool: { min: 2, max: 10, idleTimeout: 30000 },
    retries: { count: 3, backoff: "exponential" },
  },
  logging: {
    level: "info",
    outputs: { console: true, file: { enabled: false, path: "" } },
  },
};

// Users provide a partial override — DeepPartial makes every nested prop optional
type UserConfig = DeepPartial<ServerConfig>;

function mergeConfig(user: UserConfig): ServerConfig {
  return { ...defaultConfig, ...user } as ServerConfig;
}

const myConfig = mergeConfig({
  database: {
    pool: { max: 20 },
  },
  logging: {
    level: "debug",
  },
});

// After merging, everything is required — DeepRequired for the resolved config
type ResolvedConfig = DeepRequired<ServerConfig>;

// ─────────────────────────────────────────────
// Example 3: API Response Type Narrowing
// ─────────────────────────────────────────────

interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  company: string | null;
  blog: string;
  location: string | null;
  email: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubUser;
  description: string | null;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  homepage: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  forks_count: number;
  open_issues_count: number;
  topics: string[];
}

interface GitHubAPIResponse<T> {
  data: T;
  headers: {
    "x-ratelimit-limit": number;
    "x-ratelimit-remaining": number;
    "x-ratelimit-reset": number;
    link: string | null;
  };
  status: number;
}

// DeepPick to extract only the fields we care about in our app
type UserProfile = DeepPick<
  GitHubAPIResponse<GitHubUser>,
  "data.login" | "data.name" | "data.avatar_url" | "data.public_repos" | "data.followers" | "status"
>;

type RepoSummary = DeepPick<
  GitHubAPIResponse<GitHubRepo>,
  "data.full_name" | "data.description" | "data.stargazers_count" | "data.topics" | "data.language"
>;

function renderProfile(profile: UserProfile): string {
  return `${profile.data.login} (${profile.data.name}) — ${profile.data.public_repos} repos, ${profile.data.followers} followers [${profile.status}]`;
}

function renderRepoCard(summary: RepoSummary): string {
  const topics = summary.data.topics.slice(0, 3).join(", ");
  return `${summary.data.full_name} ⭐${summary.data.stargazers_count} [${summary.data.language ?? "N/A"}] — ${topics}`;
}

// ── DeepMutable for when we need to modify an API response ──

type MutableRepo = DeepMutable<DeepReadonly<GitHubRepo>>;

function normalizeRepo(repo: DeepReadonly<GitHubRepo>): MutableRepo {
  const mutable = repo as MutableRepo;
  mutable.topics = mutable.topics.map((t: string) => t.toLowerCase());
  return mutable;
}

// ─────────────────────────────────────────────
// Example 4: Feature Flags Configuration
// ─────────────────────────────────────────────

interface FeatureFlags {
  enableDarkMode: boolean;
  enableNotifications: boolean;
  experiments: {
    newDashboard: {
      enabled: boolean;
      variant: "A" | "B";
      rollout: number;
    };
    searchV2: {
      enabled: boolean;
      provider: "elastic" | "algolia";
    };
  };
  overrides: Map<string, { userId: string; value: boolean }>;
}

// Feature flags are often partially defined — DeepPartial
type FlagOverrides = DeepPartial<FeatureFlags>;

const stagingFlags: FlagOverrides = {
  experiments: {
    newDashboard: { enabled: true, variant: "A" },
  },
};

// Production flags are fully specified — DeepRequired
type ProductionFlags = DeepRequired<FeatureFlags>;

const prodFlags: ProductionFlags = {
  enableDarkMode: true,
  enableNotifications: true,
  experiments: {
    newDashboard: {
      enabled: true,
      variant: "B",
      rollout: 100,
    },
    searchV2: {
      enabled: true,
      provider: "algolia",
    },
  },
  overrides: new Map(),
};

console.log("Examples loaded successfully.");
