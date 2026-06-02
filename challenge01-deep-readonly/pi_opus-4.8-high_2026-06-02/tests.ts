/**
 * Compile-time test harness for the recursive utility types.
 *
 * Correctness is proven two ways:
 *  1. `Expect<Equal<A, B>>` — exact structural/readonly-aware type equality.
 *  2. `// @ts-expect-error` — assignments that MUST be rejected by the compiler.
 *
 * The file is also executable (`npx tsx tests.ts`) and prints a success line,
 * but the real assertions happen at type-check time: if any `Equal` is wrong or
 * any `@ts-expect-error` stops erroring, `tsgo --noEmit` fails.
 */

import type {
  DeepReadonly,
  DeepMutable,
  DeepPartial,
  DeepRequired,
  DeepPick,
} from "./types.ts";

/* ----------------------------- test helpers ----------------------------- */

type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

type Expect<T extends true> = T;

/* ------------------------------ sample data ----------------------------- */

type Original = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
  };
};

/* ------------------------------ DeepReadonly ----------------------------- */

type RO = DeepReadonly<Original>;

type _ro_full = Expect<
  Equal<
    RO,
    {
      readonly a: {
        readonly b: {
          readonly c: number;
          readonly d: readonly string[];
        };
        readonly e: ReadonlyMap<string, { readonly f: boolean }>;
      };
    }
  >
>;

// Primitives / null / undefined pass through.
type _ro_prim = Expect<Equal<DeepReadonly<string>, string>>;
type _ro_null = Expect<Equal<DeepReadonly<null>, null>>;
type _ro_undef = Expect<Equal<DeepReadonly<undefined>, undefined>>;

// Functions are left untouched.
type Fn = (x: number) => string;
type _ro_fn = Expect<Equal<DeepReadonly<{ fn: Fn }>, { readonly fn: Fn }>>;

// Tuples stay tuples (not number|string arrays).
type _ro_tuple = Expect<
  Equal<DeepReadonly<[string, number]>, readonly [string, number]>
>;
type _ro_nested_tuple = Expect<
  Equal<
    DeepReadonly<{ t: [string, { x: number }] }>,
    { readonly t: readonly [string, { readonly x: number }] }
  >
>;

// Sets become ReadonlySet.
type _ro_set = Expect<
  Equal<DeepReadonly<{ s: Set<number> }>, { readonly s: ReadonlySet<number> }>
>;

// --- Negative (mutation) assertions ---
// Wrapped in an unexecuted function: the `@ts-expect-error` checks run at
// type-check time, while `tsx` never executes the (erased) declarations.
function _readonlyMutationChecks(
  ro: RO,
  roTuple: DeepReadonly<[string, number]>,
): void {
  // @ts-expect-error cannot reassign a deeply readonly property
  ro.a.b.c = 5;
  // @ts-expect-error cannot reassign a nested readonly object
  ro.a.b = { c: 1, d: [] };
  // @ts-expect-error readonly arrays have no push
  ro.a.b.d.push("x");
  // @ts-expect-error readonly arrays reject index writes
  ro.a.b.d[0] = "x";
  // @ts-expect-error ReadonlyMap has no set
  ro.a.e.set("k", { f: true });
  // @ts-expect-error readonly tuple element cannot be written
  roTuple[0] = "y";
}

/* ------------------------------ DeepMutable ----------------------------- */

type _mut_inverse = Expect<Equal<DeepMutable<RO>, Original>>;

type _mut_map = Expect<
  Equal<
    DeepMutable<{ readonly m: ReadonlyMap<string, number> }>,
    { m: Map<string, number> }
  >
>;
type _mut_set = Expect<
  Equal<
    DeepMutable<{ readonly s: ReadonlySet<number> }>,
    { s: Set<number> }
  >
>;
type _mut_arr = Expect<
  Equal<DeepMutable<{ readonly a: readonly number[] }>, { a: number[] }>
>;
type _mut_tuple = Expect<
  Equal<DeepMutable<readonly [string, number]>, [string, number]>
>;

// --- Positive (mutation now allowed) assertions ---
function _mutableMutationChecks(mut: DeepMutable<RO>): void {
  mut.a.b.c = 99; // ok
  mut.a.b.d.push("ok"); // ok
  mut.a.e.set("k", { f: false }); // ok
}

/* ------------------------------ DeepPartial ----------------------------- */

type Config = {
  server: { host: string; port: number };
  features: { logging: boolean };
};

type _partial = Expect<
  Equal<
    DeepPartial<Config>,
    {
      server?: { host?: string; port?: number };
      features?: { logging?: boolean };
    }
  >
>;

// Arrays remain arrays (elements recurse, no optional-tuple collapse).
type _partial_arr = Expect<
  Equal<
    DeepPartial<{ items: { id: number }[] }>,
    { items?: { id?: number }[] }
  >
>;

function _partialChecks(part: DeepPartial<Config>): void {
  const _p_empty: typeof part = {}; // ok — everything optional
  const _p_some: typeof part = { server: {} }; // ok — nested optional too
  void _p_empty;
  void _p_some;
}

/* ------------------------------ DeepRequired ---------------------------- */

type PartialTree = {
  a?: {
    b?: {
      c?: number;
    };
  };
};

type _required = Expect<
  Equal<DeepRequired<PartialTree>, { a: { b: { c: number } } }>
>;

// DeepRequired is the inverse of DeepPartial for plain object trees.
type _required_inverse = Expect<
  Equal<DeepRequired<DeepPartial<Config>>, Config>
>;

function _requiredChecks(req: DeepRequired<PartialTree>): void {
  const _r_full: typeof req = { a: { b: { c: 1 } } }; // ok
  // @ts-expect-error required property `a` is missing
  const _r_bad: typeof req = {};
  void _r_full;
  void _r_bad;
}

/* ------------------------------- DeepPick ------------------------------- */

type Picked = DeepPick<Original, "a.b.c" | "a.e">;

type _pick = Expect<
  Equal<
    Picked,
    {
      a: {
        b: { c: number };
        e: Map<string, { f: boolean }>;
      };
    }
  >
>;

type _pick_single = Expect<
  Equal<DeepPick<Original, "a.b.d">, { a: { b: { d: string[] } } }>
>;

/* ----------------------------- runtime marker --------------------------- */

console.log("challenge01: all compile-time type assertions passed ✔");
