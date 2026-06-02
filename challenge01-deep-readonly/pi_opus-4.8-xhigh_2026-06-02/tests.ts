/**
 * Compile-time test harness for the deep utility types.
 *
 * Two complementary techniques are used:
 *   1. `Expect<Equals<A, B>>` proves two types are *exactly* equal (modifiers
 *      and optionality included). A mismatch is a compile error.
 *   2. `// @ts-expect-error` proves that an invalid runtime operation (e.g.
 *      mutating a `readonly` field) is rejected by the compiler. If the line
 *      ever stops erroring, the directive itself becomes the error.
 *
 * Run the type check with the project's verify command; this file emits no
 * runtime behaviour of consequence.
 */

import type {
  DeepReadonly,
  DeepMutable,
  DeepPartial,
  DeepRequired,
  DeepPick,
} from "./types.js";

/* ----------------------------- test utilities ----------------------------- */

/** Exact (invariant) type equality. */
type Equals<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

/** Compiles only when the argument is exactly `true`. */
type Expect<T extends true> = T;

/* ------------------------------ shared fixture ---------------------------- */

type Original = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
  };
};

/* ============================== 1. DeepReadonly =========================== */

type RO = DeepReadonly<Original>;

type _ro_shape = Expect<
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

// Primitives, null and undefined pass through unchanged.
type _ro_string = Expect<Equals<DeepReadonly<string>, string>>;
type _ro_null = Expect<Equals<DeepReadonly<null>, null>>;
type _ro_undef = Expect<Equals<DeepReadonly<undefined>, undefined>>;

// Functions are left intact.
type Fn = (x: number) => string;
type _ro_fn = Expect<Equals<DeepReadonly<{ run: Fn }>, { readonly run: Fn }>>;

// Tuples stay tuples (and gain `readonly`), they do not widen to unions.
type _ro_tuple = Expect<
  Equals<DeepReadonly<[string, number]>, readonly [string, number]>
>;

// Sets are made read-only too.
type _ro_set = Expect<
  Equals<DeepReadonly<Set<{ g: number }>>, ReadonlySet<{ readonly g: number }>>
>;

declare const ro: RO;
// @ts-expect-error - cannot reassign a readonly property
ro.a = ro.a;
// @ts-expect-error - nested readonly property is protected
ro.a.b.c = 1;
// @ts-expect-error - readonly arrays have no mutating `push`
ro.a.b.d.push("x");
// @ts-expect-error - readonly array elements cannot be assigned
ro.a.b.d[0] = "x";
// @ts-expect-error - ReadonlyMap exposes no `set`
ro.a.e.set("k", { f: true });

/* ============================== 2. DeepMutable =========================== */

type MutableInput = DeepReadonly<Original>;
type MUT = DeepMutable<MutableInput>;

// Round-tripping readonly -> mutable returns the original (mutable) shape.
type _mut_roundtrip = Expect<Equals<MUT, Original>>;

type _mut_tuple = Expect<
  Equals<DeepMutable<readonly [string, number]>, [string, number]>
>;
type _mut_map = Expect<
  Equals<
    DeepMutable<ReadonlyMap<string, { readonly f: boolean }>>,
    Map<string, { f: boolean }>
  >
>;

declare const mut: MUT;
// Mutation is allowed after stripping readonly (no expect-error here).
mut.a.b.c = 42;
mut.a.b.d.push("ok");
mut.a.e.set("k", { f: false });

/* ============================== 3. DeepPartial =========================== */

type PART = DeepPartial<Original>;

type _part_shape = Expect<
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

// Arrays remain arrays - elements are not turned into `T | undefined` indices.
type _part_array = Expect<
  Equals<DeepPartial<{ xs: number[] }>, { xs?: number[] }>
>;

// An entirely empty object satisfies a DeepPartial.
const partialOk: PART = {};
void partialOk;
const partialNested: PART = { a: { b: {} } };
void partialNested;

declare const part: PART;
// @ts-expect-error - `c` must be a number when present, not a string
part.a = { b: { c: "nope" } };

/* ============================== 4. DeepRequired ========================== */

type DeepOptional = {
  a?: {
    b?: {
      c?: number;
    };
    list?: Array<{ x?: number }>;
  };
};

type REQ = DeepRequired<DeepOptional>;

type _req_shape = Expect<
  Equals<
    REQ,
    {
      a: {
        b: {
          c: number;
        };
        list: Array<{ x: number }>;
      };
    }
  >
>;

// DeepPartial then DeepRequired round-trips back to the original shape.
type _req_roundtrip = Expect<Equals<DeepRequired<DeepPartial<Original>>, Original>>;

declare const req: REQ;
// @ts-expect-error - `a` is now required, so it cannot be omitted
const reqMissing: REQ = {};
void reqMissing;
// All fields are present and typed.
const c: number = req.a.b.c;
void c;

/* ============================== 5. DeepPick ============================== */

type Picked = DeepPick<Original, "a.b.c" | "a.e">;

type _pick_shape = Expect<
  Equals<
    Picked,
    {
      a: {
        b: { c: number };
        e: Map<string, { f: boolean }>;
      };
    }
  >
>;

// Picking a single leaf path yields just that branch.
type _pick_leaf = Expect<
  Equals<DeepPick<Original, "a.b.d">, { a: { b: { d: string[] } } }>
>;

// Picking a whole sub-object keeps its full shape.
type _pick_subtree = Expect<
  Equals<
    DeepPick<Original, "a.b">,
    { a: { b: { c: number; d: string[] } } }
  >
>;

declare const picked: Picked;
const fVal: boolean = picked.a.e.get("k")!.f;
void fVal;
// @ts-expect-error - `d` was not picked, so it is absent from the result
picked.a.b.d;
// @ts-expect-error - picked leaf is a number, not a string
const wrong: string = picked.a.b.c;
void wrong;

/* --------------------- silence "unused" diagnostics ----------------------- */

export type _Assertions = [
  _ro_shape,
  _ro_string,
  _ro_null,
  _ro_undef,
  _ro_fn,
  _ro_tuple,
  _ro_set,
  _mut_roundtrip,
  _mut_tuple,
  _mut_map,
  _part_shape,
  _part_array,
  _req_shape,
  _req_roundtrip,
  _pick_shape,
  _pick_leaf,
  _pick_subtree,
];
