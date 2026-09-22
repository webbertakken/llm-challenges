import type {
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types.ts";

type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

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

type ReadonlyOriginal = DeepReadonly<Original>;

type _ro_nested_number = Expect<Equal<ReadonlyOriginal["a"]["b"]["c"], number>>;
type _ro_array_is_readonly = Expect<
  Equal<ReadonlyOriginal["a"]["b"]["d"], readonly string[]>
>;
type _ro_map = Expect<
  Equal<ReadonlyOriginal["a"]["e"], ReadonlyMap<string, { readonly f: boolean }>>
>;

const frozen: DeepReadonly<Original> = {
  a: {
    b: { c: 1, d: ["x"] },
    e: new Map([["k", { f: true }]]),
  },
};

// @ts-expect-error cannot assign to readonly property
frozen.a = frozen.a;

// @ts-expect-error cannot assign to nested readonly property
frozen.a.b.c = 2;

// @ts-expect-error cannot push onto readonly array
frozen.a.b.d.push("y");

// @ts-expect-error ReadonlyMap has no set
frozen.a.e.set("n", { f: false });

type _ro_primitive = Expect<Equal<DeepReadonly<string>, string>>;
type _ro_null = Expect<Equal<DeepReadonly<null>, null>>;
type _ro_undefined = Expect<Equal<DeepReadonly<undefined>, undefined>>;
type _ro_number = Expect<Equal<DeepReadonly<number>, number>>;

type Fn = (x: number) => string;
type _ro_fn = Expect<Equal<DeepReadonly<Fn>, Fn>>;

type WithFn = { fn: Fn; n: number };
type _ro_fn_prop = Expect<Equal<DeepReadonly<WithFn>["fn"], Fn>>;

const withFn: DeepReadonly<WithFn> = { fn: (x) => String(x), n: 1 };
// @ts-expect-error cannot assign to readonly number
withFn.n = 2;

type Tuple = [string, number, { x: boolean }];
type ReadonlyTuple = DeepReadonly<Tuple>;
type _ro_tuple_shape = Expect<
  Equal<ReadonlyTuple, readonly [string, number, { readonly x: boolean }]>
>;

const tup: DeepReadonly<Tuple> = ["a", 1, { x: true }];
// @ts-expect-error cannot mutate tuple slot
tup[0] = "b";
// @ts-expect-error cannot mutate nested tuple object
tup[2].x = false;

type NestedSet = { s: Set<{ n: number }> };
const nestedSet: DeepReadonly<NestedSet> = { s: new Set([{ n: 1 }]) };
// @ts-expect-error ReadonlySet has no add
nestedSet.s.add({ n: 2 });

// ---------------------------------------------------------------------------
// DeepMutable
// ---------------------------------------------------------------------------

type MutableFromReadonly = DeepMutable<ReadonlyOriginal>;

type _mu_array = Expect<Equal<MutableFromReadonly["a"]["b"]["d"], string[]>>;
type _mu_map = Expect<
  Equal<MutableFromReadonly["a"]["e"], Map<string, { f: boolean }>>
>;

type ReadonlySrc = {
  readonly a: {
    readonly b: readonly string[];
    readonly m: ReadonlyMap<string, readonly number[]>;
    readonly s: ReadonlySet<{ readonly k: string }>;
  };
};

type Mutated = DeepMutable<ReadonlySrc>;
type _mu_nested_array = Expect<Equal<Mutated["a"]["b"], string[]>>;
type _mu_nested_map = Expect<Equal<Mutated["a"]["m"], Map<string, number[]>>>;
type _mu_nested_set = Expect<Equal<Mutated["a"]["s"], Set<{ k: string }>>>;

const mutable: DeepMutable<ReadonlySrc> = {
  a: {
    b: ["a"],
    m: new Map([["k", [1]]]),
    s: new Set([{ k: "v" }]),
  },
};
mutable.a.b.push("b");
mutable.a.m.set("k2", [2]);
mutable.a.s.add({ k: "w" });

type _mu_primitive = Expect<Equal<DeepMutable<string>, string>>;
type _mu_fn = Expect<Equal<DeepMutable<Fn>, Fn>>;
type _mu_tuple = Expect<Equal<DeepMutable<readonly [string, number]>, [string, number]>>;

const stillReadonly: DeepReadonly<{ a: number }> = { a: 1 };
// @ts-expect-error cannot assign to readonly property
stillReadonly.a = 3;

// ---------------------------------------------------------------------------
// DeepPartial
// ---------------------------------------------------------------------------

type PartialOriginal = DeepPartial<Original>;

const partialEmpty: PartialOriginal = {};
const partialA: PartialOriginal = { a: {} };
const partialNested: PartialOriginal = { a: { b: { c: 1 } } };

void partialEmpty;
void partialA;
void partialNested;

type _dp_array_stays_array = Expect<
  Equal<NonNullable<NonNullable<PartialOriginal["a"]>["b"]>["d"], string[] | undefined>
>;

type ArrHolder = { items: string[]; tuple: [number, string] };
type PartialArrHolder = DeepPartial<ArrHolder>;
type _dp_items = Expect<Equal<PartialArrHolder["items"], string[] | undefined>>;
type _dp_tuple = Expect<Equal<PartialArrHolder["tuple"], [number, string] | undefined>>;

const notFull: DeepPartial<Original> = {};
// @ts-expect-error DeepPartial is not a full Original
const _forceFull: Original = notFull;
void _forceFull;

type _dp_primitive = Expect<Equal<DeepPartial<number>, number>>;
type _dp_null = Expect<Equal<DeepPartial<null>, null>>;
type _dp_fn = Expect<Equal<DeepPartial<Fn>, Fn>>;

type NestedOptional = { a?: { b?: { c?: string } } };
type PartialNestedOptional = DeepPartial<NestedOptional>;
const pno: PartialNestedOptional = { a: { b: {} } };
void pno;

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
};

type RequiredTree = DeepRequired<OptionalTree>;
type _dr_a = Expect<Equal<RequiredTree["a"]["b"]["c"], number>>;
type _dr_d = Expect<Equal<RequiredTree["a"]["b"]["d"], string[]>>;
type _dr_map = Expect<Equal<RequiredTree["a"]["e"], Map<string, { f: boolean }>>>;

const requiredTree: RequiredTree = {
  a: {
    b: { c: 1, d: ["x"] },
    e: new Map([["k", { f: true }]]),
  },
};
void requiredTree;

// @ts-expect-error missing nested required properties
const missingTree: RequiredTree = { a: {} };
void missingTree;

type _dr_primitive = Expect<Equal<DeepRequired<string>, string>>;
type _dr_fn = Expect<Equal<DeepRequired<Fn>, Fn>>;

type InversePartial = DeepRequired<DeepPartial<Original>>;
type _roundtrip_c = Expect<Equal<InversePartial["a"]["b"]["c"], number>>;

// ---------------------------------------------------------------------------
// DeepPick
// ---------------------------------------------------------------------------

type Picked = DeepPick<Original, "a.b.c" | "a.e">;

type _pick_c = Expect<Equal<Picked["a"]["b"]["c"], number>>;
type _pick_e = Expect<Equal<Picked["a"]["e"], Map<string, { f: boolean }>>>;

const picked: Picked = {
  a: {
    b: { c: 42 },
    e: new Map(),
  },
};

// @ts-expect-error path a.b.d was not picked
picked.a.b.d;

type Single = DeepPick<Original, "a.b.d">;
type _pick_single = Expect<Equal<Single["a"]["b"]["d"], string[]>>;

type Top = DeepPick<Original, "a">;
type _pick_top = Expect<Equal<Top["a"], Original["a"]>>;

type User = {
  id: string;
  profile: {
    name: string;
    address: {
      city: string;
      zip: number;
    };
  };
  tags: string[];
};

type UserPreview = DeepPick<User, "id" | "profile.name" | "profile.address.city">;
type _up_id = Expect<Equal<UserPreview["id"], string>>;
type _up_name = Expect<Equal<UserPreview["profile"]["name"], string>>;
type _up_city = Expect<Equal<UserPreview["profile"]["address"]["city"], string>>;

const preview: UserPreview = {
  id: "1",
  profile: {
    name: "Ada",
    address: { city: "London" },
  },
};
void preview;

// @ts-expect-error zip was not picked
preview.profile.address.zip;

// @ts-expect-error tags was not picked
preview.tags;
