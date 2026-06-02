/**
 * Compile-time tests for the utility types in `./types.ts`.
 *
 * Strategy
 * --------
 * - Bidirectional `Equals<A, B>` enforces exact equality of two types.
 *   This catches both over- and under-application of the modifier.
 * - `assertEqual<true>(...)` collapses to a no-op at runtime but fails to
 *   type-check if the assertion is `false`.
 * - `// @ts-expect-error` lines prove that invalid assignments are
 *   rejected (e.g. mutating a `DeepReadonly` field).
 */

import type {
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types.ts";

// ---------------------------------------------------------------------------
// Equality helpers
// ---------------------------------------------------------------------------

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

const assertEqual = <_T extends true>(): void => {
  /* purely a type-level assertion */
};

// ---------------------------------------------------------------------------
// DeepReadonly
// ---------------------------------------------------------------------------

{
  type Original = {
    a: {
      b: {
        c: number;
        d: string[];
      };
      e: Map<string, { f: boolean }>;
    };
    g: Set<number>;
    h: [number, string];
    i: (x: number) => string;
    j: null;
    k: undefined;
  };

  type R = DeepReadonly<Original>;

  type Expected = {
    readonly a: {
      readonly b: {
        readonly c: number;
        readonly d: readonly string[];
      };
      readonly e: ReadonlyMap<string, { readonly f: boolean }>;
    };
    readonly g: ReadonlySet<number>;
    readonly h: readonly [number, string];
    readonly i: (x: number) => string;
    readonly j: null;
    readonly k: undefined;
  };

  assertEqual<Equals<R, Expected>>();

  // Primitives at the top level pass through.
  assertEqual<Equals<DeepReadonly<string>, string>>();
  assertEqual<Equals<DeepReadonly<number>, number>>();
  assertEqual<Equals<DeepReadonly<null>, null>>();
  assertEqual<Equals<DeepReadonly<undefined>, undefined>>();

  // Runtime checks the modifier really sticks.
  const ro: R = {
    a: { b: { c: 1, d: ["x"] }, e: new Map() },
    g: new Set(),
    h: [1, "x"],
    i: (x) => String(x),
    j: null,
    k: undefined,
  };

  // @ts-expect-error - top-level property is readonly
  ro.a = { b: { c: 2, d: [] }, e: new Map() };
  // @ts-expect-error - nested property is readonly
  ro.a.b.c = 2;
  // @ts-expect-error - nested array is readonly
  ro.a.b.d.push("y");
  // @ts-expect-error - ReadonlyMap has no `set`
  ro.a.e.set("x", { f: true });
  // @ts-expect-error - ReadonlySet has no `add`
  ro.g.add(1);
  // @ts-expect-error - readonly tuple slot
  ro.h[0] = 9;

  void ro;
}

// ---------------------------------------------------------------------------
// DeepMutable
// ---------------------------------------------------------------------------

{
  type Frozen = {
    readonly a: {
      readonly b: {
        readonly c: number;
        readonly d: readonly string[];
      };
      readonly e: ReadonlyMap<string, { readonly f: boolean }>;
    };
    readonly g: ReadonlySet<number>;
    readonly h: readonly [number, string];
  };

  type M = DeepMutable<Frozen>;

  type Expected = {
    a: {
      b: {
        c: number;
        d: string[];
      };
      e: Map<string, { f: boolean }>;
    };
    g: Set<number>;
    h: [number, string];
  };

  assertEqual<Equals<M, Expected>>();

  // Round-trip: mutable -> readonly -> mutable.
  assertEqual<Equals<DeepMutable<DeepReadonly<Expected>>, Expected>>();
}

// ---------------------------------------------------------------------------
// DeepPartial
// ---------------------------------------------------------------------------

{
  type Original = {
    a: {
      b: {
        c: number;
        d: string[];
      };
    };
    h: [number, string];
    fn: (x: number) => string;
  };

  type P = DeepPartial<Original>;

  type Expected = {
    a?: {
      b?: {
        c?: number;
        d?: string[]; // arrays stay arrays, not turned into tuples
      };
    };
    h?: [number?, string?]; // tuple slots become optional
    fn?: (x: number) => string;
  };

  assertEqual<Equals<P, Expected>>();

  // A fully-empty object satisfies the deep-partial.
  const empty: P = {};
  void empty;

  // Partially-populated also satisfies.
  const partial: P = { a: { b: {} } };
  void partial;
}

// ---------------------------------------------------------------------------
// DeepRequired
// ---------------------------------------------------------------------------

{
  type Original = {
    a?: {
      b?: {
        c?: number;
        d?: string[];
      };
    };
    h?: [number?, string?];
  };

  type R = DeepRequired<Original>;

  type Expected = {
    a: {
      b: {
        c: number;
        d: string[];
      };
    };
    h: [number, string];
  };

  assertEqual<Equals<R, Expected>>();

  // Round-trip: partial -> required.
  type RoundTrip = DeepRequired<DeepPartial<Expected>>;
  assertEqual<Equals<RoundTrip, Expected>>();

  // Missing nested field is rejected.
  // @ts-expect-error - `b` is now required
  const bad: R = { a: {}, h: [1, "x"] };
  void bad;
}

// ---------------------------------------------------------------------------
// DeepPick
// ---------------------------------------------------------------------------

{
  type Original = {
    a: {
      b: {
        c: number;
        d: string[];
      };
      e: Map<string, { f: boolean }>;
    };
    z: boolean;
  };

  // Single path -> only that path is preserved.
  type Single = DeepPick<Original, "a.b.c">;
  assertEqual<Equals<Single, { a: { b: { c: number } } }>>();

  // Sibling paths at different depths merge correctly.
  type Both = DeepPick<Original, "a.b.c" | "a.e">;
  assertEqual<
    Equals<Both, { a: { b: { c: number }; e: Map<string, { f: boolean }> } }>
  >();

  // Leaf may itself be a complex value (Map preserved).
  type LeafIsMap = DeepPick<Original, "a.e">;
  assertEqual<
    Equals<LeafIsMap, { a: { e: Map<string, { f: boolean }> } }>
  >();

  // Top-level picks work too.
  type TopLevel = DeepPick<Original, "z">;
  assertEqual<Equals<TopLevel, { z: boolean }>>();

  // Three siblings at the deepest level.
  type Triple = DeepPick<Original, "a.b.c" | "a.b.d" | "a.e">;
  assertEqual<
    Equals<
      Triple,
      {
        a: {
          b: { c: number; d: string[] };
          e: Map<string, { f: boolean }>;
        };
      }
    >
  >();

  // Picking an unrelated key yields `never` for that branch, so the result
  // has no usable shape. We surface this as a compile-time error.
  type Invalid = DeepPick<Original, "a.b.nope">;
  // @ts-expect-error - the path does not exist on the source type
  const _bad: Invalid = { a: { b: { nope: 1 } } };
  void _bad;
}

// ---------------------------------------------------------------------------
// Recursive / self-referential shapes
// ---------------------------------------------------------------------------

{
  interface TreeNode {
    value: number;
    children: TreeNode[];
  }

  type RoTree = DeepReadonly<TreeNode>;

  const t: RoTree = { value: 1, children: [] };
  // @ts-expect-error - readonly through recursion
  t.value = 2;
  // @ts-expect-error - readonly through recursion
  t.children.push({ value: 2, children: [] });
  void t;
}

// ---------------------------------------------------------------------------
// Runtime smoke-test entry point.
// ---------------------------------------------------------------------------

console.log("All deep-utility type assertions compiled successfully.");
