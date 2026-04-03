import {
  DeepReadonly,
  DeepMutable,
  DeepPartial,
  DeepRequired,
  DeepPick,
} from "./types";

// Example 1: Immutable Redux State Management
// Prevents accidental mutations of state during rendering
const userState = {
  id: 1,
  profile: {
    name: "John",
    email: "john@example.com",
    preferences: {
      theme: "dark",
      notifications: true,
    },
  },
};

// Create an immutable copy of state for rendering
// This ensures that state cannot be mutated during the render cycle
const renderState: DeepReadonly<typeof userState> = userState;

// This prevents mutations:
// @ts-expect-error - Cannot mutate nested state
renderState.profile.name = "Jane";
// @ts-expect-error - Cannot mutate nested state
renderState.profile.preferences.theme = "light";

// Example 2: API Response Type Safety
// DeepPick allows extracting specific fields from large API responses
const apiResponse = {
  data: {
    users: [
      {
        id: 1,
        name: "Alice",
        email: "alice@example.com",
        metadata: {
          createdAt: "2024-01-01",
          updatedAt: "2024-01-02",
        },
      },
      {
        id: 2,
        name: "Bob",
        email: "bob@example.com",
        metadata: {
          createdAt: "2024-01-02",
          updatedAt: "2024-01-03",
        },
      },
    ],
  },
  meta: {
    total: 2,
    page: 1,
  },
};

// Extract only the user IDs and names
// @ts-expect-error - Should return the value at the path, not the whole object
const userList: DeepPick<typeof apiResponse, "data.users"> = apiResponse;

// Example 3: Configuration Object Validation
// DeepPartial for development mode (optional config values)
const devConfig = {
  apiUrl: "http://localhost:3000",
  // development mode: some fields are optional
  debug: true,
  // @ts-expect-error - logging.level is optional in dev mode
  logging: {
    level: "debug",
  },
  // @ts-expect-error - cache is optional in dev mode
  cache: {
    ttl: 3600,
  },
};

// DeepRequired for production (all fields required)
const prodConfig: DeepRequired<{
  apiUrl: string;
  debug?: boolean;
  logging?: { level: string };
  cache?: { ttl: number };
}> = {
  apiUrl: "https://api.example.com",
  debug: false,
  logging: {
    level: "info",
  },
  cache: {
    ttl: 86400,
  },
};
// @ts-expect-error - Cannot delete required field
delete prodConfig.apiUrl;

// Example 4: Form State Management
// DeepPartial for handling form fields that are conditionally required
interface FormState {
  personal: {
    firstName: string;
    lastName: string;
    email: string;
  };
  contact: {
    phone?: string;
    address?: string;
  };
  preferences: {
    newsletter: boolean;
    notifications: boolean;
  };
}

type PartialFormState = DeepPartial<FormState>;

const initialForm: PartialFormState = {
  personal: {
    firstName: "Test",
    lastName: "User",
  },
};
// @ts-expect-error - Cannot access email when it's not set
console.log(initialForm.personal.email);

// Example 5: Event Handler State
// DeepReadonly for event handlers that receive state
interface EventState {
  events: {
    type: string;
    payload: {
      data: {
        id: number;
        timestamp: number;
      };
    };
  }[];
}

const readonlyEventHandlerState: DeepReadonly<EventState> = {
  events: [
    {
      type: "user.created",
      payload: {
        data: {
          id: 1,
          timestamp: 1234567890,
        },
      },
    },
  ],
};
// @ts-expect-error - Cannot mutate event state
readonlyEventHandlerState.events[0].type = "user.updated";
