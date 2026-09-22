import {
  DeepReadonly,
  DeepMutable,
  DeepPartial,
  DeepRequired,
  DeepPick,
} from './types.js';

/**
 * Example 1: Immutable Redux / Global State Management
 * Ensures no reducer or subscriber can accidentally mutate nested state directly.
 */
interface UserState {
  profile: {
    name: string;
    roles: string[];
    metadata: Map<string, { lastLogin: Date; loginCount: number }>;
  };
  preferences: {
    theme: 'light' | 'dark';
    notifications: {
      email: boolean;
      push: boolean;
    };
  };
}

export type ImmutableUserState = DeepReadonly<UserState>;

export function createInitialState(): ImmutableUserState {
  const meta = new Map<string, { lastLogin: Date; loginCount: number }>();
  meta.set('web', { lastLogin: new Date(), loginCount: 1 });
  return {
    profile: {
      name: 'Alice',
      roles: ['admin', 'editor'],
      metadata: meta,
    },
    preferences: {
      theme: 'dark',
      notifications: {
        email: true,
        push: false,
      },
    },
  };
}

/**
 * Example 2: Hierarchical Application Config with Overrides
 * Using DeepPartial to specify partial configuration overrides, and DeepRequired
 * to ensure that merged/resolved configurations have all defaults filled in.
 */
interface AppConfigSchema {
  server: {
    host: string;
    port: number;
    tls: {
      enabled: boolean;
      certPath?: string;
      keyPath?: string;
    };
  };
  database: {
    url: string;
    pool: {
      min: number;
      max: number;
      idleTimeoutMs: number;
    };
  };
  features: {
    betaTester: boolean;
    rateLimiting: boolean;
  };
}

export type AppConfigOverrides = DeepPartial<AppConfigSchema>;
export type ResolvedAppConfig = DeepRequired<AppConfigSchema>;

export function applyConfigOverrides(
  defaults: ResolvedAppConfig,
  overrides: AppConfigOverrides
): ResolvedAppConfig {
  return {
    server: {
      host: overrides.server?.host ?? defaults.server.host,
      port: overrides.server?.port ?? defaults.server.port,
      tls: {
        enabled: overrides.server?.tls?.enabled ?? defaults.server.tls.enabled,
        certPath: overrides.server?.tls?.certPath ?? defaults.server.tls.certPath,
        keyPath: overrides.server?.tls?.keyPath ?? defaults.server.tls.keyPath,
      },
    },
    database: {
      url: overrides.database?.url ?? defaults.database.url,
      pool: {
        min: overrides.database?.pool?.min ?? defaults.database.pool.min,
        max: overrides.database?.pool?.max ?? defaults.database.pool.max,
        idleTimeoutMs: overrides.database?.pool?.idleTimeoutMs ?? defaults.database.pool.idleTimeoutMs,
      },
    },
    features: {
      betaTester: overrides.features?.betaTester ?? defaults.features.betaTester,
      rateLimiting: overrides.features?.rateLimiting ?? defaults.features.rateLimiting,
    },
  };
}

/**
 * Example 3: GraphQL-like / Selective API Response Projection
 * DeepPick extracts precisely the requested fields from a comprehensive API schema.
 */
interface CustomerAccountApiEntity {
  id: string;
  identity: {
    firstName: string;
    lastName: string;
    ssn: string;
  };
  billing: {
    creditCard: {
      token: string;
      last4: string;
      exp: string;
    };
    invoices: {
      id: string;
      amount: number;
      status: 'paid' | 'pending';
    }[];
  };
}

// Public customer summary projection picking only safe, public fields
export type PublicCustomerSummary = DeepPick<
  CustomerAccountApiEntity,
  'id' | 'identity.firstName' | 'billing.creditCard.last4'
>;

export function getPublicSummary(entity: CustomerAccountApiEntity): PublicCustomerSummary {
  return {
    id: entity.id,
    identity: {
      firstName: entity.identity.firstName,
    },
    billing: {
      creditCard: {
        last4: entity.billing.creditCard.last4,
      },
    },
  };
}

/**
 * Example 4: Converting Readonly DTO to Mutable Domain Model
 */
export function cloneToMutable<T>(readonlyDto: DeepReadonly<T>): DeepMutable<T> {
  return JSON.parse(JSON.stringify(readonlyDto));
}
