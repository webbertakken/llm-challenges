import type {
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? true
    : false;

type Expect<Value extends true> = Value;

type Original = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
    s: Set<{ id: string }>;
  };
  tuple: [string, { count: number }];
  callback: (value: string) => number;
  nullable: null;
  maybe: undefined;
};

type ReadonlyOriginal = DeepReadonly<Original>;

type ReadonlyChecks = [
  Expect<Equal<DeepReadonly<string>, string>>,
  Expect<Equal<DeepReadonly<null>, null>>,
  Expect<Equal<DeepReadonly<undefined>, undefined>>,
  Expect<Equal<ReadonlyOriginal["callback"], (value: string) => number>>,
  Expect<Equal<ReadonlyOriginal["a"]["b"]["d"], readonly string[]>>,
  Expect<Equal<ReadonlyOriginal["a"]["e"], ReadonlyMap<string, { readonly f: boolean }>>>,
  Expect<Equal<ReadonlyOriginal["a"]["s"], ReadonlySet<{ readonly id: string }>>>,
  Expect<Equal<ReadonlyOriginal["tuple"], readonly [string, { readonly count: number }]>>,
];

const readonlyValue: ReadonlyOriginal = {
  a: {
    b: { c: 1, d: ["one"] },
    e: new Map([["feature", { f: true }]]),
    s: new Set([{ id: "alpha" }]),
  },
  tuple: ["name", { count: 2 }],
  callback: (value) => value.length,
  nullable: null,
  maybe: undefined,
};

// @ts-expect-error DeepReadonly rejects top-level reassignment.
readonlyValue.a = readonlyValue.a;
// @ts-expect-error DeepReadonly rejects nested property mutation.
readonlyValue.a.b.c = 2;
// @ts-expect-error DeepReadonly rejects nested array mutation.
readonlyValue.a.b.d.push("two");
// @ts-expect-error DeepReadonly exposes readonly Map values.
readonlyValue.a.e.get("feature")!.f = false;
// @ts-expect-error DeepReadonly exposes a ReadonlySet, not a mutable Set.
readonlyValue.a.s.add({ id: "beta" });
// @ts-expect-error DeepReadonly preserves tuples as readonly tuples.
readonlyValue.tuple[1].count = 3;

type MutableOriginal = DeepMutable<ReadonlyOriginal>;

type MutableChecks = [
  Expect<Equal<MutableOriginal["a"]["b"]["d"], string[]>>,
  Expect<Equal<MutableOriginal["a"]["e"], Map<string, { f: boolean }>>>,
  Expect<Equal<MutableOriginal["a"]["s"], Set<{ id: string }>>>,
  Expect<Equal<MutableOriginal["tuple"], [string, { count: number }]>>,
];

const mutableValue: MutableOriginal = {
  a: {
    b: { c: 1, d: ["one"] },
    e: new Map([["feature", { f: true }]]),
    s: new Set([{ id: "alpha" }]),
  },
  tuple: ["name", { count: 2 }],
  callback: (value) => value.length,
  nullable: null,
  maybe: undefined,
};

mutableValue.a.b.c = 2;
mutableValue.a.b.d.push("two");
mutableValue.a.e.get("feature")!.f = false;
mutableValue.a.s.add({ id: "beta" });
mutableValue.tuple[1].count = 3;

type PartialOriginal = DeepPartial<Original>;

type PartialChecks = [
  Expect<Equal<PartialOriginal["a"], { b?: { c?: number; d?: string[] }; e?: Map<string, { f?: boolean }>; s?: Set<{ id?: string }> } | undefined>>,
  Expect<Equal<PartialOriginal["tuple"], [string, { count?: number }] | undefined>>,
];

const partialValue: PartialOriginal = {
  a: {
    b: { d: ["one"] },
    e: new Map([["feature", {}]]),
    s: new Set([{}]),
  },
  tuple: ["name", {}],
};

// @ts-expect-error DeepPartial keeps arrays as arrays with the original element type.
partialValue.a!.b!.d = [1];
// @ts-expect-error DeepPartial preserves tuple length.
partialValue.tuple = ["name"];

type RequiredInput = {
  a?: {
    b?: {
      c?: number;
      d?: string[];
    };
    e?: Map<string, { f?: boolean }>;
  };
  tuple?: [string, { count?: number }];
};

type RequiredOriginal = DeepRequired<RequiredInput>;

type RequiredChecks = [
  Expect<Equal<RequiredOriginal["a"]["b"], { c: number; d: string[] }>>,
  Expect<Equal<RequiredOriginal["a"]["e"], Map<string, { f: boolean }>>>,
  Expect<Equal<RequiredOriginal["tuple"], [string, { count: number }]>>,
];

const requiredValue: RequiredOriginal = {
  a: {
    b: { c: 1, d: ["one"] },
    e: new Map([["feature", { f: true }]]),
  },
  tuple: ["name", { count: 1 }],
};

const missingRequiredNested: RequiredOriginal = {
  // @ts-expect-error DeepRequired rejects omitted nested properties.
  a: { b: { c: 1, d: ["one"] }, e: new Map([["feature", {}]]) },
  tuple: ["name", { count: 1 }],
};

void requiredValue;
void missingRequiredNested;

type Picked = DeepPick<Original, "a.b.c" | "a.e" | "tuple">;
type PickedChecks = [
  Expect<Equal<Picked["a"]["b"]["c"], number>>,
  Expect<Equal<Picked["a"]["e"], Map<string, { f: boolean }>>>,
  Expect<Equal<Picked["tuple"], [string, { count: number }]>>,
];

const pickedValue: Picked = {
  a: {
    b: { c: 1 },
    e: new Map([["feature", { f: true }]]),
  },
  tuple: ["name", { count: 1 }],
};

// @ts-expect-error DeepPick omits properties outside the selected paths.
pickedValue.a.b.d;
// @ts-expect-error DeepPick requires every selected path.
const missingPicked: Picked = { a: { b: { c: 1 } }, tuple: ["name", { count: 1 }] };

void readonlyValue;
void mutableValue;
void partialValue;
void pickedValue;
void missingPicked;
