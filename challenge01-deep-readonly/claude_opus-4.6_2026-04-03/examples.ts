import type { DeepReadonly, DeepMutable, DeepPartial, DeepRequired, DeepPick } from "./types.js";

// ─── Example 1: Immutable Redux State ──────────────────────────────────────────

interface AppState {
  user: {
    name: string;
    preferences: {
      theme: "light" | "dark";
      notifications: boolean;
      favouriteCategories: string[];
    };
  };
  posts: {
    id: number;
    title: string;
    comments: { author: string; text: string }[];
  }[];
}

// Store state is deeply immutable — reducers must return new objects
type ImmutableState = DeepReadonly<AppState>;

function selectTheme(state: ImmutableState): "light" | "dark" {
  return state.user.preferences.theme;
}

// Reducers accept the frozen state and return a new mutable copy
function updateTheme(state: ImmutableState, theme: "light" | "dark"): AppState {
  return {
    ...state,
    user: {
      ...state.user,
      preferences: {
        ...state.user.preferences,
        theme,
        favouriteCategories: [...state.user.preferences.favouriteCategories],
      },
    },
    posts: [...state.posts] as AppState["posts"],
  };
}

// ─── Example 2: API Response Partial Updates (PATCH) ───────────────────────────

interface UserProfile {
  id: number;
  email: string;
  address: {
    street: string;
    city: string;
    country: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  settings: {
    language: string;
    timezone: string;
  };
}

// PATCH endpoint accepts a deeply partial body — any subset of fields is valid
type UserPatchBody = DeepPartial<UserProfile>;

function patchUser(id: number, body: UserPatchBody): void {
  // Only the provided fields are updated
  console.log(`Patching user ${id} with`, body);
}

// All of these are valid PATCH payloads:
patchUser(1, { address: { city: "London" } });
patchUser(1, { settings: { timezone: "Europe/London" } });
patchUser(1, { email: "new@example.com", address: { coordinates: { lat: 51.5 } } });

// ─── Example 3: Config Validation with DeepRequired ────────────────────────────

interface DatabaseConfig {
  host?: string;
  port?: number;
  credentials?: {
    username?: string;
    password?: string;
  };
  pool?: {
    min?: number;
    max?: number;
  };
}

type ValidatedConfig = DeepRequired<DatabaseConfig>;

function connectToDatabase(config: ValidatedConfig): void {
  // All fields guaranteed present — no optional chaining needed
  console.log(`Connecting to ${config.host}:${config.port}`);
  console.log(`User: ${config.credentials.username}`);
  console.log(`Pool: ${config.pool.min}-${config.pool.max}`);
}

function validateConfig(raw: DatabaseConfig): ValidatedConfig {
  const defaults: ValidatedConfig = {
    host: "localhost",
    port: 5432,
    credentials: { username: "admin", password: "" },
    pool: { min: 2, max: 10 },
  };
  return { ...defaults, ...raw } as ValidatedConfig;
}

// ─── Example 4: GraphQL-style Field Selection with DeepPick ───────────────────

interface FullProduct {
  id: number;
  name: string;
  description: string;
  pricing: {
    base: number;
    currency: string;
    discounts: { code: string; percent: number }[];
  };
  inventory: {
    warehouse: string;
    quantity: number;
    reserved: number;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
  };
}

// Product card only needs name and base price — like a GraphQL selection
type ProductCardData = DeepPick<FullProduct, "name" | "pricing.base" | "pricing.currency">;

function renderProductCard(product: ProductCardData): string {
  return `${product.name}: ${product.pricing.currency}${product.pricing.base}`;
}

// ─── Example 5: Freezing & Thawing Domain Objects ──────────────────────────────

interface Document {
  title: string;
  sections: {
    heading: string;
    paragraphs: string[];
  }[];
  metadata: Map<string, string>;
}

// Freeze a document for safe sharing across threads/workers
type FrozenDocument = DeepReadonly<Document>;

// Thaw it back when editing is needed
type EditableDocument = DeepMutable<FrozenDocument>;

function freezeDocument(doc: Document): FrozenDocument {
  return doc as FrozenDocument;
}

function thawDocument(doc: FrozenDocument): EditableDocument {
  return structuredClone(doc) as unknown as EditableDocument;
}

const frozenDoc = freezeDocument({
  title: "Hello",
  sections: [{ heading: "Intro", paragraphs: ["Welcome"] }],
  metadata: new Map([["author", "Webber"]]),
});

// Can read but not modify
console.log(frozenDoc.title);

// Thaw to get a mutable copy
const editable = thawDocument(frozenDoc);
editable.title = "Updated";
editable.sections.push({ heading: "New Section", paragraphs: [] });
editable.metadata.set("editor", "Claude");
