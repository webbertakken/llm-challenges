import type { DeepReadonly, DeepPartial, DeepPick } from './types';

//========= Example 1: Immutable Redux-like State =========//

// In state management libraries, state is often treated as immutable.
// `DeepReadonly` is perfect for enforcing this at the type level.

interface AppState {
  currentUser: {
    isLoggedIn: boolean;
    profile?: {
      name: string;
      email: string;
      preferences: {
        theme: 'dark' | 'light';
        notifications: boolean;
      };
    };
  };
  posts: {
    items: Array<{ id: number; title: string }>;
    isLoading: boolean;
  };
}

// The reducer function takes the current readonly state and an action,
// and returns a new readonly state.
function postReducer(
  state: DeepReadonly<AppState>,
  action: { type: 'ADD_POST'; payload: { id: number; title: string } }
): DeepReadonly<AppState> {
  switch (action.type) {
    case 'ADD_POST':
      // @ts-expect-error: Cannot push to a readonly array
      state.posts.items.push(action.payload);

      // Instead, we must create a new state object with the updated items.
      return {
        ...state,
        posts: {
          ...state.posts,
          items: [...state.posts.items, action.payload],
        },
      };
    default:
      return state;
  }
}

//========= Example 2: Configuration Objects =========//

// `DeepPartial` is useful for representing configuration objects where
// users can override only a subset of the default settings.

interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    auth: {
      type: 'jwt' | 'apiKey';
      token: string;
    };
  };
  ui: {
    font: string;
    colors: {
      primary: string;
      secondary: string;
    };
  };
}

const defaultConfig: AppConfig = {
  api: {
    baseUrl: 'https://api.example.com',
    timeout: 5000,
    auth: {
      type: 'jwt',
      token: 'default-token',
    },
  },
  ui: {
    font: 'Inter',
    colors: {
      primary: '#007bff',
      secondary: '#6c757d',
    },
  },
};

// The user can provide only the settings they want to change.
function initializeApp(userConfig: DeepPartial<AppConfig>) {
  // Deep merging logic would go here...
  const finalConfig = {
      ...defaultConfig,
      ...userConfig,
      api: {
        ...defaultConfig.api,
        ...userConfig.api,
        auth: {
            ...defaultConfig.api.auth,
            ...userConfig.api?.auth
        }
      },
      ui: {
        ...defaultConfig.ui,
        ...userConfig.ui,
        colors: {
            ...defaultConfig.ui.colors,
            ...userConfig.ui?.colors
        }
      }
  };

  console.log(`Initializing with API URL: ${finalConfig.api.baseUrl}`);
  console.log(`UI primary color: ${finalConfig.ui.colors.primary}`);
}

initializeApp({
  api: { baseUrl: 'https://api.production.com' },
  ui: { colors: { primary: '#ff0000' } },
});


//========= Example 3: Sanitizing API Responses =========//

// When fetching data from an API, you might only need a few fields.
// `DeepPick` allows you to create a type for the exact shape you need,
// which is great for documenting data flow and reducing memory usage.

interface UserApiResponse {
    id: string;
    username: string;
    isActive: boolean;
    contact: {
        email: string;
        phone: string | null;
    };
    profile: {
        firstName: string;
        lastName: string;
        avatarUrl: string;
        lastLogin: {
            ip: string;
            timestamp: number;
        }
    };
    permissions: string[];
}

type UserSummary = DeepPick<UserApiResponse, 'username' | 'profile.avatarUrl' | 'contact.email'>;

function displayUserSummary(user: UserSummary) {
    console.log(`User: ${user.username}`);
    console.log(`Email: ${user.contact.email}`);
    console.log(`Avatar: ${user.profile.avatarUrl}`);

    // The type system prevents access to fields that weren't picked.
    // @ts-expect-error: Property 'id' does not exist
    // console.log(user.id);
    // @ts-expect-error: Property 'lastName' does not exist
    // console.log(user.profile.lastName);
}

const apiResponse: UserApiResponse = {
    id: 'usr_123',
    username: 'webdev_guru',
    isActive: true,
    contact: {
        email: 'guru@web.dev',
        phone: null
    },
    profile: {
        firstName: 'Guru',
        lastName: 'Dev',
        avatarUrl: 'https://example.com/avatar.png',
        lastLogin: {
            ip: '192.168.1.1',
            timestamp: Date.now()
        }
    },
    permissions: ['read', 'write']
};

// We can create a sanitized object that matches the UserSummary type.
const summary: UserSummary = {
    username: apiResponse.username,
    contact: {
        email: apiResponse.contact.email
    },
    profile: {
        avatarUrl: apiResponse.profile.avatarUrl
    }
};

// Type assertions to debug DeepPick
type ExpectedSummary = {
    username: string;
    profile: {
        avatarUrl: string;
    };
    contact: {
        email: string;
    };
};
const _test1: ExpectedSummary = summary;
const _test2: UserSummary = _test1;


displayUserSummary(summary);
