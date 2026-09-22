/**
 * Compile-time test suite. Everything here is verified by `tsgo --noEmit`;
 * `npx tsx tests.ts` additionally proves the file is runtime-safe (it only
 * prints a confirmation, because every assertion lives in the type system).
 */
import type {
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types.js";

/* -------------------------------------------------------------------------- */
/* Assertion helpers                                                          */
/* -------------------------------------------------------------------------- */

/** Invariant type equality (identical to the trick used by `tsd`/`expect-type`). */
type Equals<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

type Expect<T extends true> = T;

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

type Original = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
  };
};

type Kitchen = {
  prim: string;
  nul: null;
  und: undefined;
  fn: (x: number) => string;
  tuple: [string, number];
  list: { deep: boolean }[];
  set: Set<{ g: number }>;
  map: Map<string, { h: string }>;
  optional?: { i: number };
};

/* -------------------------------------------------------------------------- */
/* 1. DeepReadonly                                                            */
/* -------------------------------------------------------------------------- */

type RO = DeepReadonly<Original>;

type _ro1 = Expect<
  Equals<
    RO,
    {
      readonly a: {
        readonly b: { readonly c: number; readonly d: readonly string[] };
        readonly e: ReadonlyMap<string, { readonly f: boolean }>;
      };
    }
  >
>;

// Primitives / null / undefined pass through unchanged.
type _ro2 = Expect<Equals<DeepReadonly<string>, string>>;
type _ro3 = Expect<Equals<DeepReadonly<null>, null>>;
type _ro4 = Expect<Equals<DeepReadonly<undefined>, undefined>>;
type _ro5 = Expect<Equals<DeepReadonly<number | null>, number | null>>;

// Functions are untouched.
type _ro6 = Expect<Equals<DeepReadonly<Kitchen>["fn"], (x: number) => string>>;

// Tuples stay tuples (and gain `readonly`), they do not widen to a union array.
type _ro7 = Expect<Equals<DeepReadonly<Kitchen>["tuple"], readonly [string, number]>>;
// @ts-expect-error — a readonly tuple must NOT be equal to a widened array.
type _ro8 = Expect<Equals<DeepReadonly<Kitchen>["tuple"], readonly (string | number)[]>>;

// Sets / Maps become their readonly counterparts, recursively.
type _ro9 = Expect<Equals<DeepReadonly<Kitchen>["set"], ReadonlySet<{ readonly g: number }>>>;
type _ro10 = Expect<
  Equals<DeepReadonly<Kitchen>["map"], ReadonlyMap<string, { readonly h: string }>>
>;

// Optionality is preserved by the homomorphic mapping.
type _ro11 = Expect<
  Equals<DeepReadonly<Kitchen>["optional"], { readonly i: number } | undefined>
>;

declare const frozen: RO;

// Type-level only: never executed, only type-checked.
function _readonlyMutationChecks(): void {
  // @ts-expect-error — top-level property is readonly.
  frozen.a = frozen.a;
  // @ts-expect-error — nested property is readonly.
  frozen.a.b.c = 1;
  // @ts-expect-error — nested arrays are readonly too.
  frozen.a.b.d[0] = "x";
  // @ts-expect-error — `push` does not exist on a ReadonlyArray.
  frozen.a.b.d.push("x");
  // @ts-expect-error — `set` does not exist on a ReadonlyMap.
  frozen.a.e.set("k", { f: true });

  // Reading is of course still fine.
  const readCheck: number = frozen.a.b.c;
  const sizeCheck: number = frozen.a.e.size;
  void [readCheck, sizeCheck];
}

/* -------------------------------------------------------------------------- */
/* 2. DeepMutable                                                             */
/* -------------------------------------------------------------------------- */

type _mu1 = Expect<Equals<DeepMutable<RO>, Original>>;
type _mu2 = Expect<Equals<DeepMutable<DeepReadonly<Kitchen>>, Kitchen>>;
type _mu3 = Expect<Equals<DeepMutable<readonly [string, number]>, [string, number]>>;
type _mu4 = Expect<Equals<DeepMutable<ReadonlySet<{ readonly a: 1 }>>, Set<{ a: 1 }>>>;
type _mu5 = Expect<Equals<DeepMutable<string>, string>>;

// @ts-expect-error — DeepMutable must actually strip readonly, so it cannot equal the input.
type _mu6 = Expect<Equals<DeepMutable<RO>, RO>>;

declare const thawed: DeepMutable<RO>;

function _mutableWriteChecks(): void {
  thawed.a.b.c = 42;
  thawed.a.b.d.push("ok");
  thawed.a.e.set("k", { f: true });
}

/* -------------------------------------------------------------------------- */
/* 3. DeepPartial                                                             */
/* -------------------------------------------------------------------------- */

type PartialOriginal = DeepPartial<Original>;

type _pa1 = Expect<
  Equals<
    PartialOriginal,
    {
      a?: {
        b?: { c?: number; d?: string[] };
        e?: Map<string, { f?: boolean }>;
      };
    }
  >
>;

// Arrays stay arrays: the element type is recursed, the array itself is not
// turned into an optional-element tuple.
type _pa2 = Expect<Equals<DeepPartial<Kitchen>["list"], { deep?: boolean }[] | undefined>>;
type _pa3 = Expect<Equals<DeepPartial<{ xs: string[] }>["xs"], string[] | undefined>>;

// Tuples keep their arity.
type _pa4 = Expect<Equals<DeepPartial<Kitchen>["tuple"], [string, number] | undefined>>;

// Leaves are untouched.
type _pa5 = Expect<Equals<DeepPartial<string>, string>>;
type _pa6 = Expect<Equals<DeepPartial<Kitchen>["fn"], ((x: number) => string) | undefined>>;

const emptyPatch: PartialOriginal = {};
const shallowPatch: PartialOriginal = { a: {} };
const deepPatch: PartialOriginal = { a: { b: { c: 1 } } };

// @ts-expect-error — unknown keys are still rejected.
const badPatch: PartialOriginal = { a: { b: { zzz: 1 } } };
// @ts-expect-error — value types are still checked.
const wrongTypePatch: PartialOriginal = { a: { b: { c: "not a number" } } };

/* -------------------------------------------------------------------------- */
/* 4. DeepRequired                                                            */
/* -------------------------------------------------------------------------- */

type _rq1 = Expect<Equals<DeepRequired<PartialOriginal>, Original>>;
type _rq2 = Expect<Equals<DeepRequired<{ a?: { b?: string } }>, { a: { b: string } }>>;
type _rq3 = Expect<Equals<DeepRequired<Kitchen>["optional"], { i: number }>>;
type _rq4 = Expect<Equals<DeepRequired<string>, string>>;

// @ts-expect-error — the optional marker really is gone.
type _rq5 = Expect<Equals<DeepRequired<{ a?: string }>, { a?: string }>>;

// @ts-expect-error — required properties must be supplied.
const missing: DeepRequired<PartialOriginal> = { a: { b: { c: 1, d: [] } } };

/* -------------------------------------------------------------------------- */
/* 5. DeepPick                                                                */
/* -------------------------------------------------------------------------- */

type Picked = DeepPick<Original, "a.b.c" | "a.e">;

type _pk1 = Expect<
  Equals<Picked, { a: { b: { c: number }; e: Map<string, { f: boolean }> } }>
>;

type _pk2 = Expect<Equals<DeepPick<Original, "a.b">, { a: { b: { c: number; d: string[] } } }>>;
type _pk3 = Expect<Equals<DeepPick<Kitchen, "prim" | "tuple">, { prim: string; tuple: [string, number] }>>;

// @ts-expect-error — "a.b.zzz" is not a path in `Original`.
type _pk4 = DeepPick<Original, "a.b.zzz">;
// @ts-expect-error — cannot descend through a leaf.
type _pk5 = DeepPick<Original, "a.b.c.d">;
// @ts-expect-error — the picked shape does not contain the unpicked sibling `d`.
type _pk6 = Expect<Equals<Picked, { a: { b: { c: number; d: string[] }; e: Map<string, { f: boolean }> } }>>;

declare const picked: Picked;

function _pickChecks(): void {
  const pickedValue: number = picked.a.b.c;
  // @ts-expect-error — `d` was not picked.
  picked.a.b.d;
  void pickedValue;
}

/* -------------------------------------------------------------------------- */
/* Circular / recursive structures                                            */
/* -------------------------------------------------------------------------- */

interface TreeNode {
  value: number;
  children: TreeNode[];
  parent?: TreeNode;
}

// Recursion through a *named* interface is deferred, so this instantiates fine.
declare const roTree: DeepReadonly<TreeNode>;

function _recursiveChecks(): void {
  const treeValue: number = roTree.children[0]!.value;
  // @ts-expect-error — readonly all the way down.
  roTree.children[0]!.value = 1;
  void treeValue;
}

/* -------------------------------------------------------------------------- */

export const compileTimeAssertions = [
  "DeepReadonly",
  "DeepMutable",
  "DeepPartial",
  "DeepRequired",
  "DeepPick",
] as const;

// Touch the runtime bindings so the file is meaningful when executed directly.
void [
  emptyPatch,
  shallowPatch,
  deepPatch,
  badPatch,
  wrongTypePatch,
  missing,
  _readonlyMutationChecks,
  _mutableWriteChecks,
  _pickChecks,
  _recursiveChecks,
];

console.log(`All ${compileTimeAssertions.length} type families asserted at compile time.`);
