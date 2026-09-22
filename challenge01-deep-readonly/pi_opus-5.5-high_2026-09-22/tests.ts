import type { DeepMutable, DeepPartial, DeepPick, DeepReadonly, DeepRequired, Path } from "./types.js";

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

type Equal<A, B> = (<X>() => X extends A ? 1 : 2) extends <X>() => X extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type Not<T extends boolean> = T extends true ? false : true;

declare function value<T>(): T;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type Original = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
  };
};

type Fn = (x: number) => string;

type Kitchen = {
  id: number;
  label?: string;
  nothing: null;
  missing: undefined;
  fn: Fn;
  created: Date;
  pair: [string, number];
  tags: Set<{ name: string }>;
  nested: { list: { v: number }[]; deeper?: { flag: boolean } };
};

// ---------------------------------------------------------------------------
// 1. DeepReadonly
// ---------------------------------------------------------------------------

type RO = DeepReadonly<Original>;

export type ReadonlyTests = [
  Expect<Equal<RO["a"]["b"]["d"], readonly string[]>>,
  Expect<Equal<RO["a"]["e"], ReadonlyMap<string, { readonly f: boolean }>>>,
  Expect<
    Equal<
      RO,
      {
        readonly a: {
          readonly b: { readonly c: number; readonly d: readonly string[] };
          readonly e: ReadonlyMap<string, { readonly f: boolean }>;
        };
      }
    >
  >,
  // Edge cases
  Expect<Equal<DeepReadonly<string>, string>>,
  Expect<Equal<DeepReadonly<null>, null>>,
  Expect<Equal<DeepReadonly<undefined>, undefined>>,
  Expect<Equal<DeepReadonly<Fn>, Fn>>,
  Expect<Equal<DeepReadonly<Date>, Date>>,
  Expect<Equal<DeepReadonly<[string, number]>, readonly [string, number]>>,
  Expect<Equal<DeepReadonly<[{ a: 1 }]>, readonly [{ readonly a: 1 }]>>,
  Expect<Equal<DeepReadonly<Set<{ x: number }>>, ReadonlySet<{ readonly x: number }>>>,
  Expect<Equal<DeepReadonly<{ a: string } | null>, { readonly a: string } | null>>,
  Expect<Equal<DeepReadonly<Kitchen>["fn"], Fn>>,
  Expect<Equal<DeepReadonly<Kitchen>["label"], string | undefined>>,
  Expect<Not<Equal<DeepReadonly<[string, number]>, readonly (string | number)[]>>>,
];

declare const ro: RO;
// @ts-expect-error - top-level property is readonly
ro.a = value<RO["a"]>();
// @ts-expect-error - nested property is readonly
ro.a.b.c = 1;
// @ts-expect-error - arrays become readonly
ro.a.b.d.push("x");
// @ts-expect-error - array elements are readonly
ro.a.b.d[0] = "x";
// @ts-expect-error - Maps become ReadonlyMap (no `set`)
ro.a.e.set("k", { f: true });
// @ts-expect-error - Map values are deeply readonly
ro.a.e.get("k")!.f = false;

declare const roTuple: DeepReadonly<[string, number]>;
// @ts-expect-error - tuple slots are readonly
roTuple[0] = "x";
// @ts-expect-error - tuple keeps its positional types
const wrongSlot: string = roTuple[1];

declare const roSet: DeepReadonly<Set<{ x: number }>>;
// @ts-expect-error - Sets become ReadonlySet (no `add`)
roSet.add({ x: 1 });

// Reading still works and functions remain callable.
const readC: number = ro.a.b.c;
const called: string = value<DeepReadonly<Kitchen>>().fn(1);

// Circular references are fine (deferred mapped types).
interface TreeNode {
  value: number;
  children: TreeNode[];
  parent: TreeNode | null;
}
declare const tree: DeepReadonly<TreeNode>;
const grandChildValue: number | undefined = tree.children[0]?.children[0]?.value;
// @ts-expect-error - readonly all the way down a recursive structure
tree.children[0]!.parent!.value = 1;

// ---------------------------------------------------------------------------
// 2. DeepMutable
// ---------------------------------------------------------------------------

type Frozen = {
  readonly a: {
    readonly list: readonly { readonly v: number }[];
    readonly pair: readonly [string, number];
    readonly map: ReadonlyMap<string, { readonly x: number }>;
    readonly set: ReadonlySet<string>;
    readonly fn: Fn;
  };
};

export type MutableTests = [
  Expect<
    Equal<
      DeepMutable<Frozen>,
      {
        a: {
          list: { v: number }[];
          pair: [string, number];
          map: Map<string, { x: number }>;
          set: Set<string>;
          fn: Fn;
        };
      }
    >
  >,
  Expect<Equal<DeepMutable<RO>, Original>>,
  Expect<Equal<DeepMutable<DeepReadonly<Kitchen>>, Kitchen>>,
  Expect<Equal<DeepMutable<number>, number>>,
  Expect<Equal<DeepMutable<null>, null>>,
  Expect<Equal<DeepMutable<undefined>, undefined>>,
];

declare const thawed: DeepMutable<Frozen>;
thawed.a.list.push({ v: 1 });
thawed.a.list[0]!.v = 2;
thawed.a.pair[0] = "ok";
thawed.a.map.set("k", { x: 1 });
thawed.a.set.add("s");
// @ts-expect-error - tuple positions keep their types after thawing
thawed.a.pair[1] = "not a number";
// @ts-expect-error - value types are not widened
thawed.a.list[0]!.v = "2";

// ---------------------------------------------------------------------------
// 3. DeepPartial
// ---------------------------------------------------------------------------

type PO = DeepPartial<Original>;

export type PartialTests = [
  Expect<
    Equal<
      PO,
      {
        a?: {
          b?: { c?: number; d?: string[] };
          e?: Map<string, { f?: boolean }>;
        };
      }
    >
  >,
  // Arrays remain arrays (no `(T | undefined)[]`), their object elements become partial
  Expect<Equal<DeepPartial<{ v: number }[]>, { v?: number }[]>>,
  Expect<Equal<DeepPartial<string[]>, string[]>>,
  Expect<Equal<DeepPartial<readonly string[]>, readonly string[]>>,
  // Tuples keep their arity
  Expect<Equal<DeepPartial<[string, { x: number }]>, [string, { x?: number }]>>,
  Expect<Equal<DeepPartial<string>, string>>,
  Expect<Equal<DeepPartial<null>, null>>,
  Expect<Equal<DeepPartial<Fn>, Fn>>,
  Expect<Equal<DeepPartial<Kitchen>["created"], Date | undefined>>,
];

const emptyPartial: PO = {};
const sparsePartial: PO = { a: { b: { d: ["x"] } } };
// @ts-expect-error - types of provided values are still checked
const badPartial: PO = { a: { b: { c: "not a number" } } };
// @ts-expect-error - arrays do not accept undefined holes
const holeyPartial: PO = { a: { b: { d: [undefined] } } };
// @ts-expect-error - unknown keys are still rejected
const extraPartial: PO = { a: { z: 1 } };

// ---------------------------------------------------------------------------
// 4. DeepRequired
// ---------------------------------------------------------------------------

type Loose = {
  a?: {
    b?: { c?: number; d?: string[] };
    t?: [x?: string, y?: number];
    m?: Map<string, { f?: boolean }>;
    explicit: string | undefined;
  };
};

export type RequiredTests = [
  Expect<
    Equal<
      DeepRequired<Loose>,
      {
        a: {
          b: { c: number; d: string[] };
          t: [string, number];
          m: Map<string, { f: boolean }>;
          explicit: string | undefined;
        };
      }
    >
  >,
  Expect<Equal<DeepRequired<DeepPartial<Original>>, Original>>,
  Expect<Equal<DeepRequired<DeepPartial<Kitchen>>["nested"], { list: { v: number }[]; deeper: { flag: boolean } }>>,
  Expect<Equal<DeepRequired<DeepPartial<Kitchen>>["pair"], [string, number]>>,
  Expect<Equal<DeepRequired<DeepPartial<Kitchen>>["fn"], Fn>>,
  // Documented limitation (shared with built-in `Required`): an optional property whose only
  // type is `undefined` collapses to `never` once `?` is removed.
  Expect<Equal<DeepRequired<{ missing?: undefined }>, { missing: never }>>,
  Expect<Equal<DeepRequired<string>, string>>,
  Expect<Equal<DeepRequired<undefined>, undefined>>,
];

// @ts-expect-error - nested properties become required
const missingRequired: DeepRequired<Loose> = { a: { b: { c: 1 }, t: ["", 1], m: new Map(), explicit: undefined } };
const fullRequired: DeepRequired<Loose> = {
  a: { b: { c: 1, d: [] }, t: ["", 1], m: new Map([["k", { f: true }]]), explicit: undefined },
};

// ---------------------------------------------------------------------------
// 5. DeepPick
// ---------------------------------------------------------------------------

type Picked = DeepPick<Original, "a.b.c" | "a.e">;

type Account = {
  id: string;
  profile?: { name: string; avatar: { url: string; size: number } | null };
  readonly settings: { theme: "dark" | "light"; beta: boolean };
};

export type PickTests = [
  Expect<Equal<Picked, { a: { b: { c: number }; e: Map<string, { f: boolean }> } }>>,
  Expect<Equal<DeepPick<Original, "a.b">, { a: { b: { c: number; d: string[] } } }>>,
  // A shorter path wins over a longer one below it
  Expect<Equal<DeepPick<Original, "a.b" | "a.b.c">, { a: { b: { c: number; d: string[] } } }>>,
  // Modifiers and null/undefined branches are preserved
  Expect<
    Equal<
      DeepPick<Account, "profile.avatar.url" | "settings.theme">,
      {
        profile?: { avatar: { url: string } | null };
        readonly settings: { theme: "dark" | "light" };
      }
    >
  >,
  Expect<Equal<Path<Original>, "a" | "a.b" | "a.e" | "a.b.c" | "a.b.d">>,
];

// @ts-expect-error - unknown path
export type BadPick1 = DeepPick<Original, "a.x">;
// @ts-expect-error - paths must go through existing parents
export type BadPick2 = DeepPick<Original, "b.c">;
// @ts-expect-error - cannot walk into arrays / leaves
export type BadPick3 = DeepPick<Original, "a.b.d.length">;

// @ts-expect-error - unpicked siblings are gone
const pickedWithSibling: Picked = { a: { b: { c: 1, d: [] }, e: new Map() } };
const pickedOk: Picked = { a: { b: { c: 1 }, e: new Map() } };

// Circular types: Path is depth-limited, DeepPick still works on shallow paths.
export type TreePick = Expect<Equal<DeepPick<TreeNode, "parent.value">, { parent: { value: number } | null }>>;

export {
  readC,
  called,
  grandChildValue,
  wrongSlot,
  emptyPartial,
  sparsePartial,
  badPartial,
  holeyPartial,
  extraPartial,
  missingRequired,
  fullRequired,
  pickedWithSibling,
  pickedOk,
};
