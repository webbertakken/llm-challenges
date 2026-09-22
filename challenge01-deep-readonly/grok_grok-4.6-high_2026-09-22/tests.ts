import type {
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types.ts";

type Expect<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

type Original = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
    g: Set<{ h: string }>;
    t: [string, number];
    fn: (x: number) => string;
  };
};

// ---------------------------------------------------------------------------
// DeepReadonly
// ---------------------------------------------------------------------------

type ReadonlyResult = DeepReadonly<Original>;

type _readonly_primitive = Expect<Equal<DeepReadonly<string>, string>>;
type _readonly_null = Expect<Equal<DeepReadonly<null>, null>>;
type _readonly_undefined = Expect<Equal<DeepReadonly<undefined>, undefined>>;
type _readonly_number = Expect<Equal<DeepReadonly<number>, number>>;

type _readonly_c = Expect<
  Equal<ReadonlyResult["a"]["b"]["c"], number>
>;
type _readonly_d = Expect<
  Equal<ReadonlyResult["a"]["b"]["d"], ReadonlyArray<string>>
>;
type _readonly_e = Expect<
  Equal<ReadonlyResult["a"]["e"], ReadonlyMap<string, { readonly f: boolean }>>
>;
type _readonly_g = Expect<
  Equal<ReadonlyResult["a"]["g"], ReadonlySet<{ readonly h: string }>>
>;
type _readonly_tuple = Expect<
  Equal<ReadonlyResult["a"]["t"], readonly [string, number]>
>;
type _readonly_fn = Expect<
  Equal<ReadonlyResult["a"]["fn"], (x: number) => string>
>;

declare const ro: ReadonlyResult;

const _okNumber: number = ro.a.b.c;
const _okFn: string = ro.a.fn(1);

// @ts-expect-error cannot assign to readonly object property
ro.a = ro.a;

// @ts-expect-error cannot assign to nested readonly property
ro.a.b.c = 1;

// @ts-expect-error cannot mutate readonly array
ro.a.b.d.push("x");

// @ts-expect-error cannot assign into readonly array index
ro.a.b.d[0] = "z";

// @ts-expect-error cannot mutate readonly tuple
ro.a.t[0] = "no";

// @ts-expect-error ReadonlyMap has no set
ro.a.e.set("k", { f: true });

// @ts-expect-error ReadonlySet has no add
ro.a.g.add({ h: "x" });

// ---------------------------------------------------------------------------
// DeepMutable
// ---------------------------------------------------------------------------

type Frozen = {
  readonly a: {
    readonly b: readonly string[];
    readonly t: readonly [number, boolean];
    readonly m: ReadonlyMap<string, { readonly n: number }>;
    readonly s: ReadonlySet<readonly string[]>;
  };
};

type MutableResult = DeepMutable<Frozen>;

type _mutable_b = Expect<Equal<MutableResult["a"]["b"], string[]>>;
type _mutable_t = Expect<Equal<MutableResult["a"]["t"], [number, boolean]>>;
type _mutable_m = Expect<
  Equal<MutableResult["a"]["m"], Map<string, { n: number }>>
>;
type _mutable_s = Expect<Equal<MutableResult["a"]["s"], Set<string[]>>>;
type _mutable_roundtrip = Expect<
  Equal<DeepMutable<DeepReadonly<Original>>, Original>
>;

declare const mut: MutableResult;
mut.a.b.push("ok");
mut.a.t[0] = 9;
mut.a.m.set("k", { n: 1 });
mut.a.s.add(["x"]);

declare const stillReadonly: Frozen;
// @ts-expect-error source remains readonly before DeepMutable
stillReadonly.a.b.push("no");

// ---------------------------------------------------------------------------
// DeepPartial
// ---------------------------------------------------------------------------

type PartialResult = DeepPartial<Original>;

type _partial_a_optional = Expect<Equal<PartialResult["a"] | undefined, PartialResult["a"]>>;
type _partial_array = Expect<
  Equal<NonNullable<NonNullable<PartialResult["a"]>["b"]>["d"], string[] | undefined> extends true
    ? false
    : NonNullable<NonNullable<PartialResult["a"]>["b"]>["d"] extends string[] | undefined
      ? true
      : false
>;

const partialEmpty: DeepPartial<Original> = {};
const partialNested: DeepPartial<Original> = { a: { b: { c: 1 } } };
const partialArrayStaysArray: DeepPartial<Original> = {
  a: { b: { d: ["a", "b"] } },
};

void partialEmpty;
void partialNested;
void partialArrayStaysArray;

type ArrayHolder = { items: { id: number }[] };
type PartialArrayHolder = DeepPartial<ArrayHolder>;
type _partial_keeps_array = Expect<
  Equal<NonNullable<PartialArrayHolder["items"]>, { id?: number }[]>
>;

type TupleHolder = { pair: [{ x: number }, { y: string }] };
type PartialTuple = DeepPartial<TupleHolder>;
type _partial_keeps_tuple = Expect<
  Equal<
    NonNullable<PartialTuple["pair"]>,
    [{ x?: number }, { y?: string }]
  >
>;

declare const ph: PartialArrayHolder;
if (ph.items) {
  ph.items.map((item) => item.id);
}

// Optional-element tuples would make array methods optional — that must not happen:
declare const wouldBeBrokenIfOptionalElements: PartialArrayHolder["items"];
wouldBeBrokenIfOptionalElements?.push({ id: 1 });

// @ts-expect-error missing required fields is only legal on DeepPartial, not Original
const _notOriginal: Original = {};

// ---------------------------------------------------------------------------
// DeepRequired
// ---------------------------------------------------------------------------

type OptionalTree = {
  a?: {
    b?: {
      c?: number;
      d?: string[];
    };
    e?: Map<string, { f?: boolean }>;
  };
  n?: number;
};

type RequiredResult = DeepRequired<OptionalTree>;

type _required_n = Expect<Equal<RequiredResult["n"], number>>;
type _required_c = Expect<Equal<RequiredResult["a"]["b"]["c"], number>>;
type _required_d = Expect<Equal<RequiredResult["a"]["b"]["d"], string[]>>;
type _required_e = Expect<
  Equal<RequiredResult["a"]["e"], Map<string, { f: boolean }>>
>;
type _required_roundtrip = Expect<
  Equal<DeepRequired<DeepPartial<Original>>, Original>
>;

declare const req: RequiredResult;
const _needC: number = req.a.b.c;
const _needN: number = req.n;

// @ts-expect-error DeepRequired values are no longer optional
const _missing: DeepRequired<OptionalTree> = {};

// @ts-expect-error nested required properties must be present
const _missingNested: DeepRequired<OptionalTree> = { a: {}, n: 1 };

// ---------------------------------------------------------------------------
// DeepPick
// ---------------------------------------------------------------------------

type Picked = DeepPick<Original, "a.b.c" | "a.e">;

type _pick_shape = Expect<
  Equal<Picked, { a: { b: { c: number }; e: Map<string, { f: boolean }> } }>
>;

type PickedSingle = DeepPick<Original, "a.b.d">;
type _pick_single = Expect<
  Equal<PickedSingle, { a: { b: { d: string[] } } }>
>;

const picked: Picked = {
  a: {
    b: { c: 42 },
    e: new Map([["k", { f: true }]]),
  },
};

const _pickedC: number = picked.a.b.c;
const _pickedE: Map<string, { f: boolean }> = picked.a.e;

void picked;

declare const pickedDecl: Picked;

// @ts-expect-error d was not picked
pickedDecl.a.b.d;

// @ts-expect-error g was not picked
pickedDecl.a.g;

// @ts-expect-error cannot pick a path that does not exist
type _pick_invalid = DeepPick<Original, "a.missing">;

// ---------------------------------------------------------------------------
// Function properties stay unchanged under every transform
// ---------------------------------------------------------------------------

type WithFn = { fn: (x: number) => string; nested: { fn: () => void } };
type _fn_ro = Expect<Equal<DeepReadonly<WithFn>["fn"], (x: number) => string>>;
type _fn_mut = Expect<Equal<DeepMutable<WithFn>["fn"], (x: number) => string>>;
type _fn_part = Expect<Equal<NonNullable<DeepPartial<WithFn>["fn"]>, (x: number) => string>>;
type _fn_req = Expect<Equal<DeepRequired<WithFn>["fn"], (x: number) => string>>;
