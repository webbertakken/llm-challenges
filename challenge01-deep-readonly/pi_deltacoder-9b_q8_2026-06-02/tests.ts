import {
  DeepReadonly,
  DeepMutable,
  DeepPartial,
  DeepRequired,
  DeepPick,
} from "./types";

// ============================================================================
// Test 1: DeepReadonly
// ============================================================================

type Original = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
  };
};

type ReadonlyResult = DeepReadonly<Original>;

// Test: All nested properties should be readonly
const test1: ReadonlyResult = {
  a: {
    b: {
      c: 1,
      d: ["a"],
    },
    e: new Map([["key", { f: true }]]),
  },
};

// Test: Cannot mutate nested properties (should fail)
function test1a(): void {
  test1.a.b.c = 2; // @ts-expect-error - c should be readonly
}

function test1b(): void {
  test1.a.b.d.push("b"); // @ts-expect-error - d should be readonly
}

function test1c(): void {
  test1.a.e.set("key", { f: false }); // @ts-expect-error - Map should be readonly
}

// Test: Primitives pass through unchanged
const test2: DeepReadonly<string> = "hello"; // OK

// Test: null/undefined pass through
const test3: DeepReadonly<null> = null; // OK
const test4: DeepReadonly<undefined> = undefined; // OK

// Test: Functions pass through unchanged
const fn: () => void = () => {};
const test5: DeepReadonly<typeof fn> = fn; // OK

// ============================================================================
// Test 2: DeepMutable
// ============================================================================

type ReadonlyOriginal = {
  readonly a: {
    readonly b: {
      readonly c: number;
    };
  };
};

type MutableResult = DeepMutable<ReadonlyOriginal>;

// Test: Should be fully mutable
const mutable: MutableResult = {
  a: {
    b: {
      c: 1,
    },
  },
};

function test6(): void {
  mutable.a.b.c = 2; // OK - should be mutable
}

// Test: Cannot assign to readonly property of original
function test7(): void {
  const readonly: ReadonlyOriginal = { a: { b: { c: 1 } } };
  readonly.a = { b: { c: 2 } }; // @ts-expect-error - a is readonly in original
}

// ============================================================================
// Test 3: DeepPartial
// ============================================================================

type DeepPartialOriginal = {
  a: {
    b: string;
    c: number;
  };
  d: boolean;
};

type PartialResult = DeepPartial<DeepPartialOriginal>;

// Test: All properties should be optional
const partial: PartialResult = {}; // OK - all optional

const partial2: PartialResult = {
  a: {
    b: "hello",
  },
  d: true,
};

function test8(): void {
  const obj: PartialResult = {
    a: {
      b: "test",
      c: 1,
    },
  };
  obj.d = false; // OK - d is optional
}

// Test: Arrays remain arrays (not optional-element tuples)
const arrTest: DeepPartial<{ items: string[] }> = {
  items: ["a"], // OK - still an array
};

// ============================================================================
// Test 4: DeepRequired
// ============================================================================

type PartialOriginal = {
  a?: string;
  b?: number;
};

type RequiredResult = DeepRequired<PartialOriginal>;

// Test: All properties should be required
const required: RequiredResult = {
  a: "hello",
  b: 1,
}; // OK

// Test: Cannot have optional properties
function test9(): void {
  const obj: RequiredResult = {}; // @ts-expect-error - a and b are required
  obj.b = 1; // @ts-expect-error - a is still required
}

// ============================================================================
// Test 5: DeepPick
// ============================================================================

type ComplexOriginal = {
  a: {
    b: {
      c: number;
      d: string;
    };
    e: Map<string, { f: boolean }>;
  };
  f: boolean;
};

type Picked = DeepPick<ComplexOriginal, "a.b.c" | "a.e">;

// Test: Should pick nested properties
const picked: Picked = {
  "a.b.c": 1,
  "a.e": new Map([["key", { f: true }]]),
};

// Test: Union of paths
const picked2: Picked = {
  "a.b.c": 2,
  "a.e": new Map([["key", { f: false }]]),
};

function test10(): void {
  const obj: Picked = {
    "a.b.c": 3,
  }; // @ts-expect-error - missing required property "a.e"
}

// ============================================================================
// Test 6: Edge cases
// ============================================================================

// Primitives at top level
const primitiveTest: DeepReadonly<string> = "test"; // OK
const primitiveTest2: DeepPartial<number> = 1; // OK
const primitiveTest3: DeepPartial<string> = undefined; // OK

// null and undefined
const nullTest: DeepReadonly<null> = null; // OK
const undefinedTest: DeepPartial<undefined> = undefined; // OK

// Circular reference awareness (document limitation)
// Note: These types don't handle circular references - that's a limitation
// of TypeScript's type system, not our implementation

// Tuple types
const tupleTest: DeepReadonly<[string, number]> = ["a", 1]; // OK
const tupleTest2: DeepPartial<[string, number]> = ["a"]; // OK - partial tuple

// Maps and Sets
const mapTest: DeepReadonly<Map<string, number>> = new Map([["a", 1]]); // OK
const setTest: DeepReadonly<Set<string>> = new Set(["a"]); // OK

// ============================================================================
// Test 7: Combined edge cases
// ============================================================================

type ComplexNested = {
  users: {
    id: number;
    profile: {
      name: string;
      settings: {
        theme: "light" | "dark";
        notifications: boolean;
      };
    };
  }[];
};

type ReadonlyComplex = DeepReadonly<ComplexNested>;

const complexReadonly: ReadonlyComplex = {
  users: [
    {
      id: 1,
      profile: {
        name: "John",
        settings: {
          theme: "dark",
          notifications: true,
        },
      },
    },
  ],
};

function test11(): void {
  complexReadonly.users[0].profile.name = "Jane"; // @ts-expect-error - should be readonly
}

type MutableComplex = DeepMutable<ReadonlyComplex>;

const complexMutable: MutableComplex = {
  users: [
    {
      id: 1,
      profile: {
        name: "Jane",
        settings: {
          theme: "light",
          notifications: false,
        },
      },
    },
  ],
};

function test12(): void {
  complexMutable.users[0].profile.name = "Bob"; // OK - should be mutable
}

type PartialComplex = DeepPartial<ComplexNested>;

const complexPartial: PartialComplex = {
  users: [
    {
      id: 1,
    },
  ],
};

function test13(): void {
  const partial2: PartialComplex = {}; // OK - all optional
}

type RequiredComplex = DeepRequired<PartialComplex>;

const complexRequired: RequiredComplex = {
  users: [
    {
      id: 1,
      profile: {
        name: "Alice",
        settings: {
          theme: "light",
          notifications: true,
        },
      },
    },
  ],
};

function test14(): void {
  const required2: RequiredComplex = {
    users: [{ id: 1 }], // @ts-expect-error - missing profile
  };
}

// ============================================================================
// Test 8: DeepPick with various path combinations
// ============================================================================

type PickSingle = DeepPick<ComplexNested, "users.profile.name">;
const pickSingleTest: PickSingle = { "users.profile.name": "Test" };

type PickMultiple = DeepPick<
  ComplexNested,
  "users.id" | "users.profile.name"
>;
const pickMultipleTest: PickMultiple = {
  "users.id": 1,
  "users.profile.name": "Test",
};

function test15(): void {
  const pick3: PickSingle = { "users.profile.name": 123 }; // @ts-expect-error - name should be string
}
