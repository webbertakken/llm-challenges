import type {
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types.js";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (
  <T>() => T extends B ? 1 : 2
)
  ? true
  : false;

type Expect<T extends true> = T;

type Example = {
  name: string;
  meta?: {
    tags: string[];
    tuple: readonly [label: string, count?: number];
    map: Map<string, { active?: boolean }>;
    set: Set<{ code?: string }>;
  };
  callback: (value: number) => string;
  nested: {
    deep?: {
      flag?: boolean;
    };
  };
};

type ReadonlyExample = DeepReadonly<Example>;
type MutableExample = DeepMutable<ReadonlyExample>;
type PartialExample = DeepPartial<Example>;
type RequiredExample = DeepRequired<PartialExample>;
type PickedExample = DeepPick<Example, "meta.tuple" | "nested.deep.flag">;

type TopLevelPrimitive = Expect<Equal<DeepReadonly<string>, string>>;
type NullPassthrough = Expect<Equal<DeepPartial<null>, null>>;
type UndefinedPassthrough = Expect<Equal<DeepRequired<undefined>, undefined>>;
type FunctionPassthrough = Expect<
  Equal<DeepReadonly<(value: number) => string>, (value: number) => string>
>;
type TupleReadonly = Expect<
  Equal<
    NonNullable<ReadonlyExample["meta"]>["tuple"],
    readonly [label: string, count?: number | undefined]
  >
>;
type ArrayReadonly = Expect<
  Equal<NonNullable<ReadonlyExample["meta"]>["tags"], readonly string[]>
>;
type RequiredNesting = Expect<
  Equal<RequiredExample["nested"]["deep"]["flag"], boolean>
>;
type DeepPickShape = Expect<
  Equal<
    PickedExample,
    {
      meta?: {
        tuple: readonly [label: string, count?: number | undefined];
      };
      nested: {
        deep?: {
          flag?: boolean;
        };
      };
    }
  >
>;

const readonlyValue: ReadonlyExample = {
  name: "demo",
  meta: {
    tags: ["a", "b"],
    tuple: ["items", 2],
    map: new Map([["primary", { active: true }]]),
    set: new Set([{ code: "x" }]),
  },
  callback: (value) => value.toString(),
  nested: {
    deep: {
      flag: true,
    },
  },
};

// @ts-expect-error DeepReadonly makes top-level properties readonly.
readonlyValue.name = "changed";

// @ts-expect-error DeepReadonly makes nested arrays readonly.
readonlyValue.meta.tags.push("c");

// @ts-expect-error DeepReadonly makes tuple elements readonly.
readonlyValue.meta.tuple[0] = "changed";

const mutableValue: MutableExample = {
  name: "mutable",
  meta: {
    tags: ["x"],
    tuple: ["count", 1],
    map: new Map([["key", { active: false }]]),
    set: new Set([{ code: "ok" }]),
  },
  callback: (value) => value.toFixed(0),
  nested: {
    deep: {
      flag: false,
    },
  },
};

mutableValue.name = "updated";
if (!mutableValue.meta) throw new Error("expected meta");
mutableValue.meta.tags.push("y");
mutableValue.meta.tuple[0] = "label";
mutableValue.meta.map.set("next", { active: true });

const partialValue: PartialExample = {
  meta: {
    tags: [],
    tuple: [],
    map: new Map(),
    set: new Set(),
  },
};

const requiredValue: RequiredExample = {
  name: "required",
  meta: {
    tags: ["ok"],
    tuple: ["t", 1],
    map: new Map([["a", { active: true }]]),
    set: new Set([{ code: "id" }]),
  },
  callback: (value) => value.toString(),
  nested: {
    deep: {
      flag: true,
    },
  },
};

const missingRequiredTuple: RequiredExample = {
  name: "broken",
  meta: {
    tags: [],
    // @ts-expect-error DeepRequired makes the optional tuple slot required.
    tuple: ["t"],
    map: new Map(),
    set: new Set(),
  },
  callback: (value) => value.toString(),
  nested: {
    deep: {
      flag: true,
    },
  },
};

const missingRequiredNested: RequiredExample = {
  name: "broken",
  meta: {
    tags: [],
    tuple: ["t", 1],
    map: new Map(),
    set: new Set(),
  },
  callback: (value) => value.toString(),
  // @ts-expect-error DeepRequired requires nested optional objects too.
  nested: {},
};

const pickedValue: PickedExample = {
  meta: {
    tuple: ["picked", 3],
  },
  nested: {
    deep: {
      flag: true,
    },
  },
};

// @ts-expect-error DeepPick excludes non-selected branches.
pickedValue.meta.map;

// @ts-expect-error DeepPick excludes sibling properties.
pickedValue.nested.deep.extra = false;

const readonlyMap: DeepReadonly<Map<string, { active: boolean }>> = new Map([
  ["item", { active: true }],
]);

// @ts-expect-error DeepReadonly converts Map to ReadonlyMap.
readonlyMap.set("next", { active: false });

const mutableSet: DeepMutable<ReadonlySet<Readonly<{ code: string }>>> = new Set([
  { code: "mutable" },
]);

mutableSet.add({ code: "next" });

void partialValue;
void requiredValue;
void pickedValue;
void missingRequiredTuple;
void missingRequiredNested;
