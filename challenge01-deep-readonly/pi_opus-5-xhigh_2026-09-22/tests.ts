/**
 * Compile-time test suite.
 *
 * `tsgo --noEmit --strict` (or `tsc`) passing over this file *is* the test
 * result: every `Expect<Equal<...>>` must resolve to `true`, and every
 * `// @ts-expect-error` must sit on a line that really does error (an unused
 * `@ts-expect-error` is itself an error).
 *
 * It is also runnable (`npx tsx tests.ts`) and prints a short summary of the
 * handful of assertions that have runtime meaning.
 */

import type {
  DeepKeys,
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types.js";

/* ------------------------------ test harness ------------------------------ */

type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

type Expect<T extends true> = T;
type ExpectNot<T extends false> = T;

/* --------------------------------- fixture -------------------------------- */

type Original = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
  };
};

/* ------------------------------ 1. DeepReadonly --------------------------- */

type RO = DeepReadonly<Original>;

type _ro1 = Expect<Equal<RO["a"]["b"]["c"], number>>;
type _ro2 = Expect<Equal<RO["a"]["b"]["d"], readonly string[]>>;
type _ro3 = Expect<
  Equal<RO["a"]["e"], ReadonlyMap<string, { readonly f: boolean }>>
>;
type _ro4 = Expect<Equal<RO, { readonly a: RO["a"] }>>;

// Sets become ReadonlySet, recursively.
type _ro5 = Expect<
  Equal<
    DeepReadonly<{ s: Set<{ n: number }> }>,
    { readonly s: ReadonlySet<{ readonly n: number }> }
  >
>;

// Tuples stay tuples (and keep their labels/optional slots).
type _ro6 = Expect<
  Equal<DeepReadonly<[string, number]>, readonly [string, number]>
>;
type _ro7 = ExpectNot<Equal<DeepReadonly<[string, number]>, readonly (string | number)[]>>;
type _ro8 = Expect<
  Equal<DeepReadonly<[head: string, tail?: number]>, readonly [head: string, tail?: number]>
>;

// Primitives, null/undefined, functions and opaque built-ins pass through.
type _ro9 = Expect<Equal<DeepReadonly<string>, string>>;
type _ro10 = Expect<Equal<DeepReadonly<null>, null>>;
type _ro11 = Expect<Equal<DeepReadonly<undefined>, undefined>>;
type _ro12 = Expect<
  Equal<DeepReadonly<{ fn: (x: number) => string }>, { readonly fn: (x: number) => string }>
>;
type _ro13 = Expect<Equal<DeepReadonly<{ at: Date }>, { readonly at: Date }>>;

// Unions distribute.
type _ro14 = Expect<
  Equal<DeepReadonly<{ x: 1 } | string>, { readonly x: 1 } | string>
>;

// Optionality is preserved, not invented.
type _ro15 = Expect<
  Equal<DeepReadonly<{ a?: { b: 1 } }>, { readonly a?: { readonly b: 1 } }>
>;

// Self-referential interfaces are fine: recursion unfolds lazily.
interface TreeNode {
  value: number;
  children: TreeNode[];
}
type _ro16 = Expect<Equal<DeepReadonly<TreeNode>["value"], number>>;
type _ro17 = Expect<
  Equal<DeepReadonly<TreeNode>["children"], readonly DeepReadonly<TreeNode>[]>
>;

const frozen: DeepReadonly<Original> = {
  a: { b: { c: 1, d: ["x"] }, e: new Map([["k", { f: true }]]) },
};

/** Never called: every line below must fail to compile. */
function illegalWrites(): void {
  // @ts-expect-error — top-level property is readonly
  frozen.a = frozen.a;
  // @ts-expect-error — nested property is readonly
  frozen.a.b.c = 1;
  // @ts-expect-error — nested arrays lose their mutating methods
  frozen.a.b.d.push("nope");
  // @ts-expect-error — nested arrays are index-immutable
  frozen.a.b.d[0] = "nope";
  // @ts-expect-error — ReadonlyMap has no `set`
  frozen.a.e.set("k", { f: true });
}

// a readonly view is still readable
const readValue: number = frozen.a.b.c;
const readEntry: { readonly f: boolean } | undefined = frozen.a.e.get("k");

/* ------------------------------ 2. DeepMutable ---------------------------- */

type _dm1 = Expect<Equal<DeepMutable<DeepReadonly<Original>>, Original>>;
type _dm2 = Expect<
  Equal<DeepMutable<{ readonly s: ReadonlySet<{ readonly n: number }> }>, { s: Set<{ n: number }> }>
>;
type _dm3 = Expect<
  Equal<DeepMutable<readonly [string, number]>, [string, number]>
>;
type _dm4 = Expect<Equal<DeepMutable<string>, string>>;
type _dm5 = Expect<
  Equal<DeepMutable<{ readonly fn: () => void }>, { fn: () => void }>
>;

const thawed: DeepMutable<DeepReadonly<Original>> = {
  a: { b: { c: 1, d: ["x"] }, e: new Map([["k", { f: true }]]) },
};
thawed.a.b.c = 2;
thawed.a.b.d.push("y");
thawed.a.e.set("k2", { f: false });

// @ts-expect-error — a deep-readonly value is not assignable to its mutable twin
const illegalThaw: DeepMutable<Original> = frozen;

/* ------------------------------ 3. DeepPartial ---------------------------- */

type Partialled = DeepPartial<Original>;

type _dp1 = Expect<
  Equal<
    Partialled,
    { a?: { b?: { c?: number; d?: string[] }; e?: Map<string, { f?: boolean }> } }
  >
>;
// Arrays stay arrays: elements are not made optional.
type _dp2 = Expect<Equal<NonNullable<NonNullable<Partialled["a"]>["b"]>["d"], string[] | undefined>>;
type _dp3 = Expect<Equal<DeepPartial<{ list: { n: number }[] }>, { list?: { n?: number }[] }>>;
// Tuples keep their arity.
type _dp4 = Expect<Equal<DeepPartial<[{ a: 1 }, number]>, [{ a?: 1 }, number]>>;
type _dp5 = Expect<Equal<DeepPartial<{ at: Date; fn: () => void }>, { at?: Date; fn?: () => void }>>;

const sparse: DeepPartial<Original> = { a: { b: { c: 1 } } };
const emptyPatch: DeepPartial<Original> = {};

// @ts-expect-error — unknown keys are still rejected
const badPatch: DeepPartial<Original> = { a: { b: { z: 1 } } };
// @ts-expect-error — value types are still checked
const badValue: DeepPartial<Original> = { a: { b: { c: "1" } } };

/* ------------------------------ 4. DeepRequired --------------------------- */

type _dr1 = Expect<Equal<DeepRequired<DeepPartial<Original>>, Original>>;
type _dr2 = Expect<
  Equal<DeepRequired<{ a?: { b?: string | undefined } }>, { a: { b: string } }>
>;
type _dr3 = Expect<Equal<DeepRequired<[string?, number?]>, [string, number]>>;
type _dr4 = Expect<Equal<DeepRequired<{ at?: Date }>, { at: Date }>>;

// @ts-expect-error — every property is now mandatory
const incomplete: DeepRequired<DeepPartial<Original>> = { a: { b: { c: 1 } } };

/* -------------------------------- 5. DeepPick ----------------------------- */

type Picked = DeepPick<Original, "a.b.c" | "a.e">;

type _dk1 = Expect<
  Equal<DeepKeys<Original>, "a" | "a.b" | "a.b.c" | "a.b.d" | "a.e">
>;
type _pick1 = Expect<
  Equal<Picked, { a: { b: { c: number }; e: Map<string, { f: boolean }> } }>
>;
type _pick2 = Expect<Equal<DeepPick<Original, "a.b.d">, { a: { b: { d: string[] } } }>>;
// Asking for a branch *and* one of its leaves keeps the whole branch.
type _pick3 = Expect<Equal<DeepPick<Original, "a.b" | "a.b.c">, { a: { b: Original["a"]["b"] } }>>;
type _pick4 = Expect<Equal<DeepPick<Original, "a">, { a: Original["a"] }>>;

const picked: Picked = { a: { b: { c: 1 }, e: new Map() } };

// @ts-expect-error — "a.b.d" was not picked
const pickedExtra: Picked = { a: { b: { c: 1, d: [] }, e: new Map() } };
// @ts-expect-error — "a.b.zzz" is not a path of Original
type BadPath = DeepPick<Original, "a.b.zzz">;
// @ts-expect-error — "b" is not a top-level path of Original
type BadRoot = DeepPick<Original, "b">;

/* ------------------------------- runtime smoke ---------------------------- */

const assertions: Array<[string, boolean]> = [
  ["DeepReadonly view is readable", readValue === 1 && readEntry?.f === true],
  ["DeepMutable value is mutable", thawed.a.b.c === 2 && thawed.a.b.d.length === 2],
  ["DeepMutable map accepts writes", thawed.a.e.size === 2],
  ["DeepPartial accepts a sparse patch", sparse.a?.b?.c === 1],
  ["DeepPartial accepts an empty patch", Object.keys(emptyPatch).length === 0],
  ["DeepPick keeps only the picked leaves", picked.a.b.c === 1 && picked.a.e.size === 0],
];

let failed = 0;
for (const [name, ok] of assertions) {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
}
console.log(
  failed === 0
    ? `\nAll ${assertions.length} runtime assertions passed (type-level assertions are checked by tsc/tsgo).`
    : `\n${failed} runtime assertion(s) failed.`,
);
if (failed > 0) throw new Error(`${failed} runtime assertion(s) failed.`);

// Keep the type-only declarations referenced so nothing is reported as unused.
export type {
  _ro1, _ro2, _ro3, _ro4, _ro5, _ro6, _ro7, _ro8, _ro9, _ro10, _ro11, _ro12,
  _ro13, _ro14, _ro15, _ro16, _ro17,
  _dm1, _dm2, _dm3, _dm4, _dm5,
  _dp1, _dp2, _dp3, _dp4, _dp5,
  _dr1, _dr2, _dr3, _dr4,
  _dk1, _pick1, _pick2, _pick3, _pick4,
  BadPath, BadRoot,
};
export { illegalWrites, illegalThaw, badPatch, badValue, incomplete, pickedExtra };
