/**
 * Challenge 01 — Compile-time test suite
 */

import type {
  DeepReadonly,
  DeepMutable,
  DeepPartial,
  DeepRequired,
  DeepPick,
} from "./types.js";

// Helper type equality check
type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true
  : false;

type Assert<T extends true> = T;

// --- Test Types ---

type ComplexObject = {
  a: {
    b: {
      c: number;
      d: string[];
      t: [string, number];
    };
    e: Map<string, { f: boolean }>;
    s: Set<{ id: number }>;
    fn: (x: number) => string;
  };
  topPrimitive: string;
  topNull: null;
  topUndefined: undefined;
};

// 1. DeepReadonly Tests
{
  type ReadonlyComplex = DeepReadonly<ComplexObject>;

  const obj: ReadonlyComplex = {
    a: {
      b: {
        c: 42,
        d: ["hello", "world"],
        t: ["foo", 123],
      },
      e: new Map([["key", { f: true }]]),
      s: new Set([{ id: 1 }]),
      fn: (x: number) => `${x}`,
    },
    topPrimitive: "test",
    topNull: null,
    topUndefined: undefined,
  };

  // Mutating top-level primitive is an error
  // @ts-expect-error Cannot assign to 'topPrimitive' because it is a read-only property.
  obj.topPrimitive = "new";

  // Mutating nested object property is an error
  // @ts-expect-error Cannot assign to 'c' because it is a read-only property.
  obj.a.b.c = 100;

  // Mutating nested array element is an error
  // @ts-expect-error Index signature in type 'readonly string[]' only permits reading.
  obj.a.b.d[0] = "mutated";

  // Mutating tuple element is an error
  // @ts-expect-error Cannot assign to '0' because it is a read-only property.
  obj.a.b.t[0] = "bar";

  // Calling mutating Map methods is an error on ReadonlyMap
  // @ts-expect-error Property 'set' does not exist on type 'ReadonlyMap<string, { readonly f: boolean; }>'.
  obj.a.e.set("newKey", { f: false });

  // Value retrieved from map has readonly properties
  const mapVal = obj.a.e.get("key");
  if (mapVal) {
    // @ts-expect-error Cannot assign to 'f' because it is a read-only property.
    mapVal.f = false;
  }

  // Calling mutating Set methods is an error on ReadonlySet
  // @ts-expect-error Property 'add' does not exist on type 'ReadonlySet<{ readonly id: number; }>'.
  obj.a.s.add({ id: 2 });

  // Function signature remains callable
  const fnResult: string = obj.a.fn(10);

  // Top-level primitive handling
  type PrimitiveReadonly = DeepReadonly<string>;
  type _t1 = Assert<Equals<PrimitiveReadonly, string>>;
}

// 2. DeepMutable Tests
{
  type ReadonlySource = {
    readonly a: {
      readonly b: number;
      readonly list: readonly string[];
      readonly tuple: readonly [string, number];
      readonly map: ReadonlyMap<string, { readonly count: number }>;
      readonly set: ReadonlySet<{ readonly tag: string }>;
    };
  };

  type MutableResult = DeepMutable<ReadonlySource>;

  const mutableObj: MutableResult = {
    a: {
      b: 1,
      list: ["a", "b"],
      tuple: ["x", 10],
      map: new Map([["key", { count: 5 }]]),
      set: new Set([{ tag: "tag1" }]),
    },
  };

  // All modifications are permitted
  mutableObj.a.b = 2;
  mutableObj.a.list[0] = "c";
  mutableObj.a.list.push("d");
  mutableObj.a.tuple[0] = "y";
  mutableObj.a.map.set("key2", { count: 10 });
  const mVal = mutableObj.a.map.get("key");
  if (mVal) {
    mVal.count = 20;
  }
  mutableObj.a.set.add({ tag: "tag2" });
}

// 3. DeepPartial Tests
{
  type Target = {
    a: {
      b: {
        c: number;
        d: string[];
        tuple: [string, number];
      };
    };
  };

  type PartialTarget = DeepPartial<Target>;

  const partial1: PartialTarget = {};
  const partial2: PartialTarget = { a: {} };
  const partial3: PartialTarget = { a: { b: { c: 1 } } };
  const partial4: PartialTarget = {
    a: {
      b: {
        d: ["hello"],
        tuple: ["test", 42],
      },
    },
  };

  // Arrays still require string elements, not undefined elements inside array if array is supplied
  const validArray: PartialTarget = { a: { b: { d: ["str"] } } };
  // @ts-expect-error Type 'number' is not assignable to type 'string'.
  const invalidArray: PartialTarget = { a: { b: { d: [123] } } };
}

// 4. DeepRequired Tests
{
  type OptionalTarget = {
    a?: {
      b?: {
        c?: number;
        d?: string[];
      };
    };
  };

  type RequiredTarget = DeepRequired<OptionalTarget>;

  // Missing properties is an error
  // @ts-expect-error Property 'a' is missing in type '{}' but required in type 'DeepRequired<OptionalTarget>'.
  const empty: RequiredTarget = {};

  // Partial nested properties is an error
  // @ts-expect-error Property 'b' is missing in type '{}' but required in type '{ b: { c: number; d: string[]; }; }'.
  const missingNested: RequiredTarget = { a: {} };

  // Full object is valid
  const full: RequiredTarget = {
    a: {
      b: {
        c: 42,
        d: ["item"],
      },
    },
  };
}

// 5. DeepPick Tests
{
  type Source = {
    a: {
      b: {
        c: number;
        x: string;
      };
      e: Map<string, { f: boolean }>;
      other: boolean;
    };
    unrelated: string;
  };

  type Picked = DeepPick<Source, "a.b.c" | "a.e">;

  const validPick: Picked = {
    a: {
      b: {
        c: 100,
      },
      e: new Map([["key", { f: true }]]),
    },
  };

  // Disallowed properties should trigger type errors
  const invalidPick: Picked = {
    a: {
      b: {
        c: 100,
        // @ts-expect-error 'x' does not exist in type '{ c: number; }'
        x: "not-picked",
      },
      e: new Map(),
    },
  };

  const hasUnrelated: Picked = {
    a: {
      b: { c: 1 },
      e: new Map(),
    },
    // @ts-expect-error 'unrelated' does not exist in type
    unrelated: "nope",
  };
}
