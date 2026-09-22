import type {
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types.js";

type Assert<T extends true> = T;

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

type Original = {
  a: {
    b: {
      c: number;
      d: string[];
      t: [string, { n: number }];
    };
    e: Map<string, { f: boolean }>;
    s: Set<{ g: number }>;
  };
  fn: (x: number) => { y: string };
  opt?: { h: string };
  nil: null;
};

type ReadonlyOriginal = DeepReadonly<Original>;

type _primitive = Assert<Equals<DeepReadonly<string>, string>>;
type _number = Assert<Equals<DeepReadonly<number>, number>>;
type _bool = Assert<Equals<DeepReadonly<boolean>, boolean>>;
type _bigint = Assert<Equals<DeepReadonly<bigint>, bigint>>;
type _symbol = Assert<Equals<DeepReadonly<symbol>, symbol>>;
type _null = Assert<Equals<DeepReadonly<null>, null>>;
type _undefined = Assert<Equals<DeepReadonly<undefined>, undefined>>;
type _any = Assert<Equals<DeepReadonly<any>, any>>;
type _unknown = Assert<Equals<DeepReadonly<unknown>, unknown>>;
type _never = Assert<Equals<DeepReadonly<never>, never>>;

type _fnUnchanged = Assert<
  Equals<DeepReadonly<(value: { a: number }) => { b: string }>, (value: { a: number }) => { b: string }>
>;

type _dateLeaf = Assert<Equals<DeepReadonly<{ created: Date }>, { readonly created: Date }>>;

type _nestedObject = Assert<
  Equals<
    DeepReadonly<{ a: { b: { c: number } } }>,
    { readonly a: { readonly b: { readonly c: number } } }
  >
>;

type _readonlyArray = Assert<
  Equals<DeepReadonly<{ d: string[] }>, { readonly d: readonly string[] }>
>;

type _tuplePreserved = Assert<
  Equals<
    DeepReadonly<[string, { n: number }]>,
    readonly [string, { readonly n: number }]
  >
>;

type _tupleLength = Assert<Equals<DeepReadonly<[string, number]>["length"], 2>>;

type _openTuple = Assert<
  Equals<DeepReadonly<[string, ...boolean[]]>, readonly [string, ...boolean[]]>
>;

type _optionalTuple = Assert<
  Equals<DeepReadonly<[string, number?]>, readonly [string, number?]>
>;

type _map = Assert<
  Equals<
    DeepReadonly<Map<string, { f: boolean }>>,
    ReadonlyMap<string, { readonly f: boolean }>
  >
>;

type _readonlyMapIn = Assert<
  Equals<
    DeepReadonly<ReadonlyMap<string, { f: boolean }>>,
    ReadonlyMap<string, { readonly f: boolean }>
  >
>;

type _set = Assert<
  Equals<DeepReadonly<Set<{ g: number }>>, ReadonlySet<{ readonly g: number }>>
>;

type _promise = Assert<
  Equals<DeepReadonly<Promise<{ ok: boolean }>>, Promise<{ readonly ok: boolean }>>
>;

type _union = Assert<
  Equals<
    DeepReadonly<{ a: number } | { b: { c: string } }>,
    { readonly a: number } | { readonly b: { readonly c: string } }
  >
>;

type _optionalPreserved = Assert<
  Equals<DeepReadonly<{ opt?: { h: string } }>, { readonly opt?: { readonly h: string } }>
>;

type _functionProperty = Assert<
  Equals<
    DeepReadonly<{ fn: (x: number) => { y: string } }>,
    { readonly fn: (x: number) => { y: string } }
  >
>;

type _specShape = Assert<
  Equals<
    DeepReadonly<Original>["a"],
    {
      readonly b: {
        readonly c: number;
        readonly d: readonly string[];
        readonly t: readonly [string, { readonly n: number }];
      };
      readonly e: ReadonlyMap<string, { readonly f: boolean }>;
      readonly s: ReadonlySet<{ readonly g: number }>;
    }
  >
>;

declare const frozen: ReadonlyOriginal;

frozen.a.b.c;
frozen.fn;
frozen.nil;

// @ts-expect-error nested properties are readonly
frozen.a.b.c = 1;

// @ts-expect-error readonly arrays have no push
frozen.a.b.d.push("x");

// @ts-expect-error tuple slots are readonly
frozen.a.b.t[0] = "z";

// @ts-expect-error tuple element properties are readonly
frozen.a.b.t[1].n = 4;

// @ts-expect-error Map becomes ReadonlyMap
frozen.a.e.set("k", { f: true });

// @ts-expect-error Set becomes ReadonlySet
frozen.a.s.add({ g: 1 });

const mapped = frozen.a.e.get("k");
if (mapped) {
  // @ts-expect-error map values are deeply readonly
  mapped.f = false;
}

const called = frozen.fn(1);
called.y = "still mutable; functions are leaves";

type MutableRoundTrip = DeepMutable<DeepReadonly<Original>>;

type _mutableObject = Assert<
  Equals<DeepMutable<{ readonly a: { readonly b: number } }>, { a: { b: number } }>
>;

type _mutableArray = Assert<
  Equals<DeepMutable<{ readonly d: readonly string[] }>, { d: string[] }>
>;

type _mutableTuple = Assert<
  Equals<DeepMutable<readonly [string, { readonly n: number }]>, [string, { n: number }]>
>;

type _mutableMap = Assert<
  Equals<
    DeepMutable<ReadonlyMap<string, { readonly f: boolean }>>,
    Map<string, { f: boolean }>
  >
>;

type _mutableSet = Assert<
  Equals<DeepMutable<ReadonlySet<{ readonly g: number }>>, Set<{ g: number }>>
>;

type _mutablePromise = Assert<
  Equals<DeepMutable<Promise<{ readonly ok: boolean }>>, Promise<{ ok: boolean }>>
>;

declare const draft: MutableRoundTrip;
draft.a.b.c = 2;
draft.a.b.d.push("ok");
draft.a.b.t[1].n = 9;
draft.a.e.set("k", { f: true });
draft.a.s.add({ g: 3 });
draft.opt = { h: "present" };

type PartialOriginal = DeepPartial<Original>;

type _partialNested = Assert<
  Equals<
    DeepPartial<{ a: { b: number }; c: string }>,
    { a?: { b?: number }; c?: string }
  >
>;

type _partialArrayStaysArray = Assert<
  Equals<DeepPartial<{ xs: { a: number }[] }>, { xs?: { a?: number }[] }>
>;

type _partialReadonlyArray = Assert<
  Equals<
    DeepPartial<{ xs: readonly { a: number }[] }>,
    { xs?: readonly { a?: number }[] }
  >
>;

type _partialTuple = Assert<
  Equals<DeepPartial<[string, { a: number }]>, [string, { a?: number }]>
>;

type _partialTupleLength = Assert<Equals<DeepPartial<[string, { a: number }]>["length"], 2>>;

type _partialMap = Assert<
  Equals<
    DeepPartial<Map<string, { f: boolean }>>,
    Map<string, { f?: boolean }>
  >
>;

type _partialReadonlyMap = Assert<
  Equals<
    DeepPartial<ReadonlyMap<string, { f: boolean }>>,
    ReadonlyMap<string, { f?: boolean }>
  >
>;

type _partialKeepsFunction = Assert<
  Equals<
    DeepPartial<{ fn: (x: number) => { y: string } }>,
    { fn?: (x: number) => { y: string } }
  >
>;

declare const partial: PartialOriginal;
partial.a = {};
partial.a = { b: { c: 1, d: ["x"] } };
const partialHead: string = partial.a?.b?.t?.[0] ?? "";
const partialTupleLength: 2 | undefined = partial.a?.b?.t?.length;

// @ts-expect-error c is still a number when present
partial.a = { b: { c: "nope" } };

type _requiredRoundTrip = Assert<
  Equals<
    DeepRequired<DeepPartial<{ a: { b: number }; tags: string[] }>>,
    { a: { b: number }; tags: string[] }
  >
>;

type _requiredOptional = Assert<
  Equals<DeepRequired<{ a?: { b?: number } }>, { a: { b: number } }>
>;

type _requiredTupleSlot = Assert<
  Equals<DeepRequired<[string, { a?: number }?]>, [string, { a: number }]>
>;

type _requiredPreservesReadonly = Assert<
  Equals<
    DeepRequired<{ readonly a?: { readonly b?: number } }>,
    { readonly a: { readonly b: number } }
  >
>;

type _requiredArray = Assert<
  Equals<DeepRequired<{ xs?: { a?: number }[] }>, { xs: { a: number }[] }>
>;

declare const filled: DeepRequired<PartialOriginal>;
const requiredNumber: number = filled.a.b.c;
const requiredTag: string = filled.a.b.d[0] ?? "";
filled.opt.h;

type SpecPicked = DeepPick<Original, "a.b.c" | "a.e">;

type _specPick = Assert<
  Equals<
    SpecPicked,
    { a: { b: { c: number }; e: Map<string, { f: boolean }> } }
  >
>;

type _singlePick = Assert<
  Equals<DeepPick<Original, "a.b.t">, { a: { b: { t: [string, { n: number }] } } }>
>;

type _optionalPick = Assert<
  Equals<DeepPick<{ a?: { b: { c: number }; d: string } }, "a.b.c">, { a?: { b: { c: number } } }>
>;

type _unionPick = Assert<
  Equals<
    DeepPick<{ a: { b: number } } | { a: { b: string } }, "a.b">,
    { a: { b: number } } | { a: { b: string } }
  >
>;

declare const picked: SpecPicked;
const pickedC: number = picked.a.b.c;
const pickedMap: Map<string, { f: boolean }> = picked.a.e;

// @ts-expect-error d was not selected
picked.a.b.d;

// @ts-expect-error s was not selected
picked.a.s;

// @ts-expect-error c is a number
const badPick: SpecPicked["a"]["b"]["c"] = "no";

void partialHead;
void partialTupleLength;
void requiredNumber;
void requiredTag;
void pickedC;
void pickedMap;
void badPick;
void called;
