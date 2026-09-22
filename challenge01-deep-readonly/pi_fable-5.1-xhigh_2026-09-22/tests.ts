/**
 * Compile-time tests. Run with:
 *   npx tsgo --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext
 * Every `Expect<Equal<...>>` must type-check and every `@ts-expect-error`
 * must mark a genuine error.
 */
import type {
  DeepKeyOf,
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type Original = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
  };
};

// ---------------------------------------------------------------------------
// DeepReadonly
// ---------------------------------------------------------------------------

type RO = DeepReadonly<Original>;

type _ro1 = Expect<Equal<RO["a"]["b"]["d"], readonly string[]>>;
type _ro2 = Expect<Equal<RO["a"]["e"], ReadonlyMap<string, { readonly f: boolean }>>>;
type _ro3 = Expect<
  Equal<
    RO,
    {
      readonly a: {
        readonly b: { readonly c: number; readonly d: readonly string[] };
        readonly e: ReadonlyMap<string, { readonly f: boolean }>;
      };
    }
  >
>;

declare const ro: RO;
// @ts-expect-error property is readonly
ro.a = { b: { c: 1, d: [] }, e: new Map() };
// @ts-expect-error nested property is readonly
ro.a.b.c = 1;
// @ts-expect-error nested array is readonly
ro.a.b.d.push("x");
// @ts-expect-error nested array element is readonly
ro.a.b.d[0] = "x";
// @ts-expect-error Map became ReadonlyMap
ro.a.e.set("k", { f: true });
// @ts-expect-error Map value is readonly
ro.a.e.get("k")!.f = false;

// Sets
type ROSet = DeepReadonly<{ s: Set<{ n: number }> }>;
type _ro4 = Expect<Equal<ROSet, { readonly s: ReadonlySet<{ readonly n: number }> }>>;
declare const roSet: ROSet;
// @ts-expect-error Set became ReadonlySet
roSet.s.add({ n: 1 });

// Tuples stay tuples
type _ro5 = Expect<Equal<DeepReadonly<[string, number]>, readonly [string, number]>>;
type _ro6 = Expect<
  Equal<DeepReadonly<{ t: [{ x: 1 }, number?] }>, { readonly t: readonly [{ readonly x: 1 }, number?] }>
>;

// Primitives, null, undefined, unknown pass through
type _ro7 = Expect<Equal<DeepReadonly<string>, string>>;
type _ro8 = Expect<Equal<DeepReadonly<number>, number>>;
type _ro9 = Expect<Equal<DeepReadonly<null>, null>>;
type _ro10 = Expect<Equal<DeepReadonly<undefined>, undefined>>;
type _ro11 = Expect<Equal<DeepReadonly<unknown>, unknown>>;
type _ro12 = Expect<Equal<DeepReadonly<{ n: null; u: undefined }>, { readonly n: null; readonly u: undefined }>>;

// Functions and Dates remain unchanged
type Fn = (x: number) => string;
type _ro13 = Expect<Equal<DeepReadonly<Fn>, Fn>>;
type _ro14 = Expect<Equal<DeepReadonly<{ fn: Fn; when: Date }>, { readonly fn: Fn; readonly when: Date }>>;

// Optional and union members
type _ro15 = Expect<Equal<DeepReadonly<{ o?: { p: 1 } }>, { readonly o?: { readonly p: 1 } }>>;
type _ro16 = Expect<Equal<DeepReadonly<{ a: 1 } | null>, { readonly a: 1 } | null>>;

// Already readonly input is idempotent
type _ro17 = Expect<Equal<DeepReadonly<RO>, RO>>;

// Circular types resolve lazily without blowing up
type Tree = { value: number; children: Tree[] };
type ROTree = DeepReadonly<Tree>;
declare const roTree: ROTree;
// @ts-expect-error nested recursive nodes are readonly too
roTree.children[0]!.children[0]!.value = 1;
const roTreeValue: number = roTree.children[0]!.value;
void roTreeValue;

// ---------------------------------------------------------------------------
// DeepMutable
// ---------------------------------------------------------------------------

type _mu1 = Expect<Equal<DeepMutable<RO>, Original>>;
type _mu2 = Expect<Equal<DeepMutable<readonly [string, readonly number[]]>, [string, number[]]>>;
type _mu3 = Expect<
  Equal<DeepMutable<{ readonly s: ReadonlySet<readonly [1]> }>, { s: Set<[1]> }>
>;
type _mu4 = Expect<Equal<DeepMutable<string>, string>>;
type _mu5 = Expect<Equal<DeepMutable<Fn>, Fn>>;
type _mu6 = Expect<Equal<DeepMutable<{ readonly o?: readonly [1] }>, { o?: [1] }>>;

declare const mu: DeepMutable<RO>;
mu.a.b.c = 2;
mu.a.b.d.push("ok");
mu.a.e.set("k", { f: true });

// ---------------------------------------------------------------------------
// DeepPartial
// ---------------------------------------------------------------------------

type PO = DeepPartial<Original>;
type _pa1 = Expect<
  Equal<
    PO,
    {
      a?: {
        b?: { c?: number; d?: string[] };
        e?: Map<string, { f?: boolean }>;
      };
    }
  >
>;
const partialEmpty: PO = {};
const partialNested: PO = { a: { b: { d: ["x"] } } };
void partialEmpty;
void partialNested;
// @ts-expect-error wrong type still rejected
const partialWrong: PO = { a: { b: { c: "not a number" } } };
void partialWrong;

// Arrays remain arrays; elements are not made optional
type _pa2 = Expect<Equal<DeepPartial<{ list: { x: number }[] }>, { list?: { x?: number }[] }>>;
type _pa3 = Expect<Equal<DeepPartial<string[]>, string[]>>;
type _pa4 = Expect<Equal<DeepPartial<[string, number]>, [string, number]>>;
type _pa5 = Expect<Equal<DeepPartial<readonly [{ x: 1 }]>, readonly [{ x?: 1 }]>>;
// @ts-expect-error array elements are still required
const partialArray: DeepPartial<{ list: string[] }> = { list: [undefined] };
void partialArray;

// Leaves pass through
type _pa6 = Expect<Equal<DeepPartial<number>, number>>;
type _pa7 = Expect<Equal<DeepPartial<null>, null>>;
type _pa8 = Expect<Equal<DeepPartial<Fn>, Fn>>;
type _pa9 = Expect<Equal<DeepPartial<{ s: Set<{ x: 1 }> }>, { s?: Set<{ x?: 1 }> }>>;
type _pa10 = Expect<Equal<DeepPartial<{ readonly r: { x: 1 } }>, { readonly r?: { x?: 1 } }>>;

// ---------------------------------------------------------------------------
// DeepRequired
// ---------------------------------------------------------------------------

type _re1 = Expect<Equal<DeepRequired<PO>, Original>>;
type _re2 = Expect<Equal<DeepRequired<DeepPartial<{ list: { x?: number }[] }>>, { list: { x: number }[] }>>;
type _re3 = Expect<Equal<DeepRequired<{ a?: { b?: string | undefined } }>, { a: { b: string } }>>;
type _re4 = Expect<Equal<DeepRequired<{ m?: Map<string, { v?: 1 }> }>, { m: Map<string, { v: 1 }> }>>;
type _re5 = Expect<Equal<DeepRequired<{ readonly r?: [1, 2] }>, { readonly r: [1, 2] }>>;
type _re6 = Expect<Equal<DeepRequired<undefined>, undefined>>;

// @ts-expect-error nested property is now required
const required: DeepRequired<PO> = { a: { b: { c: 1 }, e: new Map() } };
void required;

// ---------------------------------------------------------------------------
// DeepKeyOf
// ---------------------------------------------------------------------------

type _k1 = Expect<Equal<DeepKeyOf<Original>, "a" | "a.b" | "a.b.c" | "a.b.d" | "a.e">>;
type _k2 = Expect<Equal<DeepKeyOf<{ 0: { x: 1 } }>, "0" | "0.x">>;
type _k3 = Expect<Equal<DeepKeyOf<string>, never>>;
type _k4 = Expect<Equal<DeepKeyOf<{ o?: { p: 1 } }>, "o" | "o.p">>;

// ---------------------------------------------------------------------------
// DeepPick
// ---------------------------------------------------------------------------

type Picked = DeepPick<Original, "a.b.c" | "a.e">;
type _pi1 = Expect<Equal<Picked, { a: { b: { c: number }; e: Map<string, { f: boolean }> } }>>;

// Picking a parent keeps the whole subtree
type _pi2 = Expect<Equal<DeepPick<Original, "a.b">, { a: { b: { c: number; d: string[] } } }>>;
type _pi3 = Expect<Equal<DeepPick<Original, "a">, Original>>;

// Modifiers are preserved
type _pi4 = Expect<
  Equal<DeepPick<{ readonly r: { o?: { x: 1; y: 2 } } }, "r.o.x">, { readonly r: { o?: { x: 1 } } }>
>;

// Numeric keys and unrelated keys sharing a prefix
type _pi5 = Expect<Equal<DeepPick<{ 0: { x: 1; y: 2 } }, "0.x">, { 0: { x: 1 } }>>;
type _pi6 = Expect<Equal<DeepPick<{ a: { x: 1 }; ab: { x: 1 } }, "a.x">, { a: { x: 1 } }>>;

const picked: Picked = { a: { b: { c: 1 }, e: new Map() } };
void picked;
// @ts-expect-error `d` was not picked
const pickedExtra: Picked = { a: { b: { c: 1, d: [] }, e: new Map() } };
void pickedExtra;
// @ts-expect-error `e` is required
const pickedMissing: Picked = { a: { b: { c: 1 } } };
void pickedMissing;

// Invalid paths are rejected
// @ts-expect-error `a.z` does not exist
type BadPath = DeepPick<Original, "a.z">;
// @ts-expect-error `a.b.c.toFixed` walks into a primitive
type BadPrimitivePath = DeepPick<Original, "a.b.c.toFixed">;
// @ts-expect-error `a.e.size` walks into a Map
type BadMapPath = DeepPick<Original, "a.e.size">;
