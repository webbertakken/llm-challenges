/**
 * Compile-time test harness.
 *
 * There are no runtime assertions here: every check is resolved by the type
 * checker. Run it with `tsc --noEmit` (or `tsgo --noEmit --strict`). A clean
 * compile means every expectation held. The file proves correctness two ways:
 *
 *   1. Exact type-equality via `Expect<Equals<Actual, Expected>>`.
 *   2. `// @ts-expect-error` lines that MUST fail to type-check (illegal
 *      mutations, illegal assignments). If such a line ever stopped erroring,
 *      the `@ts-expect-error` itself becomes a compile error — so these are
 *      genuine, self-policing assertions.
 */

import type {
  DeepReadonly,
  DeepMutable,
  DeepPartial,
  DeepRequired,
  DeepPick,
} from "./types.ts";

/* -------------------------------------------------------------------------- */
/* Test helpers                                                               */
/* -------------------------------------------------------------------------- */

/** Exact (invariant) type equality — distinguishes `readonly`, `?`, etc. */
type Equals<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

/** Compiles only when the argument is exactly `true`. */
type Expect<T extends true> = T;

/* -------------------------------------------------------------------------- */
/* Shared fixture (mirrors the README example)                               */
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

/* ========================================================================== */
/* 1. DeepReadonly                                                            */
/* ========================================================================== */

type RO = DeepReadonly<Original>;

type _RO_shape = Expect<
  Equals<
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

declare const ro: RO;

// @ts-expect-error - nested property is readonly
ro.a.b.c = 1;
// @ts-expect-error - nested property is readonly
ro.a = ro.a;
// @ts-expect-error - readonly arrays have no `push`
ro.a.b.d.push("x");
// @ts-expect-error - cannot assign to a readonly array index
ro.a.b.d[0] = "x";
// @ts-expect-error - ReadonlyMap has no `set`
ro.a.e.set("k", { f: true });

// Reading is always fine.
const okRead: boolean = ro.a.e.get("k")!.f;
void okRead;

// Primitives, null, undefined and functions pass through unchanged.
type _RO_string = Expect<Equals<DeepReadonly<string>, string>>;
type _RO_number = Expect<Equals<DeepReadonly<number>, number>>;
type _RO_null = Expect<Equals<DeepReadonly<null>, null>>;
type _RO_undef = Expect<Equals<DeepReadonly<undefined>, undefined>>;
type _RO_fn = Expect<
  Equals<DeepReadonly<(x: number) => string>, (x: number) => string>
>;

// Function-valued properties keep their signature (only the slot is readonly).
type _RO_fnProp = Expect<
  Equals<
    DeepReadonly<{ run: (x: number) => void }>,
    { readonly run: (x: number) => void }
  >
>;

// Sets become ReadonlySet, recursing into the element type.
type _RO_set = Expect<
  Equals<
    DeepReadonly<Set<{ g: number }>>,
    ReadonlySet<{ readonly g: number }>
  >
>;

// Tuples stay tuples (do not collapse to a union array).
type _RO_tuple = Expect<
  Equals<DeepReadonly<[string, number]>, readonly [string, number]>
>;

/* ========================================================================== */
/* 2. DeepMutable                                                             */
/* ========================================================================== */

type MUT = DeepMutable<RO>;

// DeepMutable undoes DeepReadonly for the whole fixture.
type _MUT_roundtrip = Expect<Equals<MUT, Original>>;

declare const mut: MUT;

// All previously-forbidden mutations are now allowed (no @ts-expect-error).
mut.a.b.c = 2;
mut.a.b.d.push("x");
mut.a.b.d[0] = "y";
mut.a.e.set("k", { f: false });

type _MUT_set = Expect<
  Equals<DeepMutable<ReadonlySet<{ readonly g: number }>>, Set<{ g: number }>>
>;
type _MUT_tuple = Expect<
  Equals<DeepMutable<readonly [string, number]>, [string, number]>
>;
type _MUT_fn = Expect<
  Equals<DeepMutable<(x: number) => string>, (x: number) => string>
>;

/* ========================================================================== */
/* 3. DeepPartial                                                             */
/* ========================================================================== */

type PART = DeepPartial<Original>;

type _PART_shape = Expect<
  Equals<
    PART,
    {
      a?: {
        b?: {
          c?: number;
          d?: string[];
        };
        e?: Map<string, { f?: boolean }>;
      };
    }
  >
>;

// Everything is optional, so an empty object satisfies it.
const part: PART = {};
void part;

// A partial nested object is accepted too.
const part2: PART = { a: { b: {} } };
void part2;

// @ts-expect-error - `c` must still be a number when present
const partBad: PART = { a: { b: { c: "not a number" } } };
void partBad;

// Arrays stay arrays of (deep-)partial elements, NOT optional-element tuples
// and NOT `(T | undefined)[]`.
type _PART_array = Expect<
  Equals<DeepPartial<{ x: number }[]>, { x?: number }[]>
>;
type _PART_primArray = Expect<Equals<DeepPartial<number[]>, number[]>>;

// Tuples remain tuples.
type _PART_tuple = Expect<
  Equals<
    DeepPartial<[{ x: number }, string]>,
    [{ x?: number }, string]
  >
>;

/* ========================================================================== */
/* 4. DeepRequired                                                            */
/* ========================================================================== */

type REQ = DeepRequired<PART>;

// DeepRequired is the inverse of DeepPartial for the fixture.
type _REQ_roundtrip = Expect<Equals<REQ, Original>>;

declare const req: REQ;
const reqC: number = req.a.b.c; // every level is present again
void reqC;

type DeeplyOptional = {
  p?: {
    q?: number;
    r?: string[];
  };
};
type _REQ_shape = Expect<
  Equals<
    DeepRequired<DeeplyOptional>,
    { p: { q: number; r: string[] } }
  >
>;

// @ts-expect-error - `p` is required after DeepRequired, cannot be omitted
const reqBad: DeepRequired<DeeplyOptional> = {};
void reqBad;

/* ========================================================================== */
/* 5. DeepPick                                                                */
/* ========================================================================== */

type Picked = DeepPick<Original, "a.b.c" | "a.e">;

type _PICK_shape = Expect<
  Equals<
    Picked,
    { a: { b: { c: number }; e: Map<string, { f: boolean }> } }
  >
>;

// Single leaf path picks just that branch.
type _PICK_single = Expect<
  Equals<DeepPick<Original, "a.b.d">, { a: { b: { d: string[] } } }>
>;

// Sibling leaves merge cleanly under a shared branch.
type _PICK_siblings = Expect<
  Equals<
    DeepPick<Original, "a.b.c" | "a.b.d">,
    { a: { b: { c: number; d: string[] } } }
  >
>;

// Picking a non-leaf path keeps the whole subtree.
type _PICK_branch = Expect<
  Equals<DeepPick<Original, "a.b">, { a: { b: { c: number; d: string[] } } }>
>;

// A leaf path wins over a more specific path under it.
type _PICK_leafWins = Expect<
  Equals<DeepPick<Original, "a.b" | "a.b.c">, { a: { b: { c: number; d: string[] } } }>
>;

declare const picked: Picked;
const pickedC: number = picked.a.b.c;
void pickedC;

// @ts-expect-error - `d` was not picked into the result
picked.a.b.d;

/* ========================================================================== */
/* Circular / self-referential types                                         */
/* ========================================================================== */

interface TreeNode {
  value: number;
  children: TreeNode[];
}

type RoTree = DeepReadonly<TreeNode>;
declare const tree: RoTree;

const treeVal: number = tree.value;
void treeVal;

// @ts-expect-error - recursive node value is readonly
tree.value = 5;
// @ts-expect-error - recursive children array is readonly
tree.children.push(tree);
// @ts-expect-error - a grandchild is readonly too (recursion really descends)
tree.children[0].value = 9;

interface ListNode {
  data: string;
  next: ListNode | null;
}
type PartialList = DeepPartial<ListNode>;
const list: PartialList = { data: "head", next: { next: null } };
void list;

/* -------------------------------------------------------------------------- */
/* Surface the helper aliases so an unused-locals pass stays quiet.           */
/* -------------------------------------------------------------------------- */

export type {
  _RO_shape,
  _RO_string,
  _RO_number,
  _RO_null,
  _RO_undef,
  _RO_fn,
  _RO_fnProp,
  _RO_set,
  _RO_tuple,
  _MUT_roundtrip,
  _MUT_set,
  _MUT_tuple,
  _MUT_fn,
  _PART_shape,
  _PART_array,
  _PART_primArray,
  _PART_tuple,
  _REQ_roundtrip,
  _REQ_shape,
  _PICK_shape,
  _PICK_single,
  _PICK_siblings,
  _PICK_branch,
  _PICK_leafWins,
};
