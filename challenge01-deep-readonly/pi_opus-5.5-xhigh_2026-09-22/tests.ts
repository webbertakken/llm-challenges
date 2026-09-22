/**
 * Compile-time tests. `npx tsgo --noEmit ...` is the real test run: every `Expect<Equal<...>>`
 * must hold and every `// @ts-expect-error` must be consumed by a genuine error.
 * The `check*` functions are type-checked only; they are never executed.
 */
import type { DeepMutable, DeepPartial, DeepPick, DeepReadonly, DeepRequired, Paths } from "./types.js";

type Equal<X, Y> = (<G>() => G extends X ? 1 : 2) extends <G>() => G extends Y ? 1 : 2 ? true : false;
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

interface TreeNode {
  value: number;
  children: TreeNode[];
  parent?: TreeNode;
}

type WithExtras = {
  id: string;
  created: Date;
  pattern: RegExp;
  onChange: (value: { next: number }) => void;
  Ctor: new (seed: number) => { seed: number };
  payload: unknown;
  maybe: { x: number } | null;
  nothing: undefined;
  pair: [string, { n: number }];
  tags: Set<{ label: string }>;
};

// ---------------------------------------------------------------------------
// DeepReadonly
// ---------------------------------------------------------------------------

export type DeepReadonlyCases = [
  // The README says `a.b.d` becomes `readonly number[]`; `d` is `string[]`, so it is `readonly string[]`.
  Expect<
    Equal<
      DeepReadonly<Original>,
      {
        readonly a: {
          readonly b: { readonly c: number; readonly d: readonly string[] };
          readonly e: ReadonlyMap<string, { readonly f: boolean }>;
        };
      }
    >
  >,
  // primitives, null and undefined pass through
  Expect<Equal<DeepReadonly<string>, string>>,
  Expect<Equal<DeepReadonly<42>, 42>>,
  Expect<Equal<DeepReadonly<null>, null>>,
  Expect<Equal<DeepReadonly<undefined>, undefined>>,
  Expect<Equal<DeepReadonly<string | null>, string | null>>,
  // functions stay untouched, at the top level and as properties
  Expect<Equal<DeepReadonly<(x: { a: number }) => string>, (x: { a: number }) => string>>,
  Expect<Equal<DeepReadonly<WithExtras>["onChange"], (value: { next: number }) => void>>,
  Expect<Equal<DeepReadonly<WithExtras>["Ctor"], new (seed: number) => { seed: number }>>,
  // atomic built-ins, unknown and nullable unions
  Expect<Equal<DeepReadonly<WithExtras>["created"], Date>>,
  Expect<Equal<DeepReadonly<WithExtras>["pattern"], RegExp>>,
  Expect<Equal<DeepReadonly<WithExtras>["payload"], unknown>>,
  Expect<Equal<DeepReadonly<WithExtras>["maybe"], { readonly x: number } | null>>,
  Expect<Equal<DeepReadonly<WithExtras>["nothing"], undefined>>,
  // tuples stay tuples
  Expect<Equal<DeepReadonly<[string, number]>, readonly [string, number]>>,
  Expect<Equal<DeepReadonly<WithExtras>["pair"], readonly [string, { readonly n: number }]>>,
  // sets and nested arrays
  Expect<Equal<DeepReadonly<WithExtras>["tags"], ReadonlySet<{ readonly label: string }>>>,
  Expect<Equal<DeepReadonly<{ grid: number[][] }>, { readonly grid: readonly (readonly number[])[] }>>,
  // circular references resolve lazily
  Expect<Equal<DeepReadonly<TreeNode>["children"][number]["children"][number]["value"], number>>,
];

function checkDeepReadonly(state: DeepReadonly<Original>, tree: DeepReadonly<TreeNode>): void {
  // @ts-expect-error - top-level property is readonly
  state.a = { b: { c: 1, d: [] }, e: new Map() };
  // @ts-expect-error - nested property is readonly
  state.a.b.c = 2;
  // @ts-expect-error - arrays become readonly arrays
  state.a.b.d.push("x");
  // @ts-expect-error - array elements are readonly
  state.a.b.d[0] = "x";
  // @ts-expect-error - maps become ReadonlyMap
  state.a.e.set("k", { f: true });
  const entry = state.a.e.get("k");
  if (entry) {
    // @ts-expect-error - map values are deeply readonly
    entry.f = false;
  }
  // @ts-expect-error - recursion through a circular type
  tree.children[0].parent!.value = 1;

  // Reads are unaffected, and a mutable value is still assignable to the readonly view.
  const c: number = state.a.b.c;
  const original: Original = { a: { b: { c, d: [] }, e: new Map() } };
  const view: DeepReadonly<Original> = original;
  void view;
}

// ---------------------------------------------------------------------------
// DeepMutable
// ---------------------------------------------------------------------------

export type DeepMutableCases = [
  Expect<Equal<DeepMutable<DeepReadonly<Original>>, Original>>,
  Expect<Equal<DeepMutable<string>, string>>,
  Expect<Equal<DeepMutable<null>, null>>,
  Expect<Equal<DeepMutable<readonly [string, { readonly n: number }]>, [string, { n: number }]>>,
  Expect<Equal<DeepMutable<ReadonlySet<{ readonly x: number }>>, Set<{ x: number }>>>,
  Expect<Equal<DeepMutable<{ readonly fn: (x: readonly number[]) => void }>, { fn: (x: readonly number[]) => void }>>,
  Expect<Equal<DeepMutable<{ readonly list?: readonly string[] }>, { list?: string[] }>>,
];

function checkDeepMutable(frozen: DeepReadonly<Original>): void {
  const draft: DeepMutable<typeof frozen> = { a: { b: { c: 1, d: ["x"] }, e: new Map() } };
  draft.a.b.c = 2;
  draft.a.b.d.push("y");
  draft.a.e.set("k", { f: true });
  // @ts-expect-error - mutability does not loosen property types
  draft.a.b.c = "2";
  // @ts-expect-error - a readonly array is not assignable to the mutable one
  draft.a.b.d = frozen.a.b.d;
}

// ---------------------------------------------------------------------------
// DeepPartial
// ---------------------------------------------------------------------------

export type DeepPartialCases = [
  Expect<
    Equal<
      DeepPartial<Original>,
      { a?: { b?: { c?: number; d?: string[] }; e?: Map<string, { f?: boolean }> } }
    >
  >,
  Expect<Equal<DeepPartial<string>, string>>,
  Expect<Equal<DeepPartial<undefined>, undefined>>,
  // arrays stay arrays: no `undefined` elements, no optional-element tuples
  Expect<Equal<DeepPartial<{ list: { id: number }[] }>, { list?: { id?: number }[] }>>,
  Expect<Equal<DeepPartial<[string, { n: number }]>, [string, { n?: number }]>>,
  Expect<Equal<DeepPartial<readonly { n: number }[]>, readonly { n?: number }[]>>,
  // functions untouched
  Expect<Equal<DeepPartial<{ fn: (x: { a: number }) => void }>, { fn?: (x: { a: number }) => void }>>,
  // readonly-ness is preserved
  Expect<Equal<DeepPartial<{ readonly r: { n: number } }>, { readonly r?: { n?: number } }>>,
];

function checkDeepPartial(): void {
  const empty: DeepPartial<Original> = {};
  const nested: DeepPartial<Original> = { a: { b: { d: ["x"] } } };
  const mapped: DeepPartial<Original> = { a: { e: new Map([["k", {}]]) } };
  // @ts-expect-error - nested property types are still checked
  const wrongType: DeepPartial<Original> = { a: { b: { c: "1" } } };
  // @ts-expect-error - unknown nested properties are rejected
  const unknownKey: DeepPartial<Original> = { a: { b: { z: 1 } } };
  // @ts-expect-error - array elements are not made optional (no `undefined` elements)
  const holes: DeepPartial<Original> = { a: { b: { d: [undefined] } } };
  void [empty, nested, mapped, wrongType, unknownKey, holes];
}

// ---------------------------------------------------------------------------
// DeepRequired
// ---------------------------------------------------------------------------

type Settings = {
  theme?: { dark?: boolean; accent?: string | undefined };
  plugins?: { name?: string }[];
  window?: [width?: number, height?: number];
};

export type DeepRequiredCases = [
  Expect<Equal<DeepRequired<DeepPartial<Original>>, Original>>,
  Expect<
    Equal<
      DeepRequired<Settings>,
      {
        theme: { dark: boolean; accent: string };
        plugins: { name: string }[];
        window: [width: number, height: number];
      }
    >
  >,
  Expect<Equal<DeepRequired<number>, number>>,
  Expect<Equal<DeepRequired<null>, null>>,
  Expect<Equal<DeepRequired<{ m?: Map<string, { v?: number }> }>, { m: Map<string, { v: number }> }>>,
  Expect<Equal<DeepRequired<{ fn?: (x?: number) => void }>, { fn: (x?: number) => void }>>,
];

function checkDeepRequired(): void {
  const complete: DeepRequired<Settings> = {
    theme: { dark: true, accent: "teal" },
    plugins: [{ name: "git" }],
    window: [800, 600],
  };
  // @ts-expect-error - nested properties become required
  const missingNested: DeepRequired<Settings> = { theme: { dark: true }, plugins: [], window: [1, 2] };
  // @ts-expect-error - optional tuple elements become required
  const shortTuple: DeepRequired<Settings> = { theme: { dark: true, accent: "a" }, plugins: [], window: [1] };
  // @ts-expect-error - `undefined` is no longer accepted
  const undefinedAccent: DeepRequired<Settings> = { theme: { dark: true, accent: undefined }, plugins: [], window: [1, 2] };
  void [complete, missingNested, shortTuple, undefinedAccent];
}

// ---------------------------------------------------------------------------
// DeepPick (and Paths)
// ---------------------------------------------------------------------------

type Api = {
  readonly id: string;
  profile?: { name: string; bio: string; avatar: { url: string; size: number } };
  orders: { id: number; total: number; lines: { sku: string; qty: number }[] }[];
  settings: Map<string, string>;
  refresh: () => void;
};

export type DeepPickCases = [
  Expect<Equal<Paths<Original>, "a" | "a.b" | "a.b.c" | "a.b.d" | "a.e">>,
  Expect<
    Equal<DeepPick<Original, "a.b.c" | "a.e">, { a: { b: { c: number }; e: Map<string, { f: boolean }> } }>
  >,
  // a path ending at an object keeps the whole subtree
  Expect<Equal<DeepPick<Original, "a.b">, { a: { b: { c: number; d: string[] } } }>>,
  Expect<Equal<DeepPick<Original, "a" | "a.b.c">, Original>>,
  // modifiers are preserved, optional parents stay optional
  Expect<Equal<DeepPick<Api, "id">, { readonly id: string }>>,
  Expect<Equal<DeepPick<Api, "profile.avatar.url">, { profile?: { avatar: { url: string } } }>>,
  // picking through arrays picks from each element
  Expect<
    Equal<
      DeepPick<Api, "orders.id" | "orders.lines.sku">,
      { orders: { id: number; lines: { sku: string }[] }[] }
    >
  >,
  // maps and functions are leaves
  Expect<Equal<DeepPick<Api, "settings" | "refresh">, { settings: Map<string, string>; refresh: () => void }>>,
  // recursive types are supported up to the path depth limit
  Expect<Equal<DeepPick<TreeNode, "children.children.value">, { children: { children: { value: number }[] }[] }>>,
];

// @ts-expect-error - unknown segment
export type BadSegment = DeepPick<Original, "a.x">;
// @ts-expect-error - cannot descend into a primitive
export type IntoPrimitive = DeepPick<Original, "a.b.c.d">;
// @ts-expect-error - cannot descend into a Map
export type IntoMap = DeepPick<Original, "a.e.f">;
// @ts-expect-error - one invalid member poisons the whole union
export type MixedPaths = DeepPick<Original, "a.b.c" | "a.q">;

function checkDeepPick(): void {
  const summary: DeepPick<Api, "id" | "profile.name" | "orders.total"> = {
    id: "u1",
    profile: { name: "Ada" },
    orders: [{ total: 10 }],
  };
  // @ts-expect-error - fields that were not picked are rejected
  const leaky: DeepPick<Api, "id" | "profile.name"> = { id: "u1", profile: { name: "Ada", bio: "..." } };
  // @ts-expect-error - picked fields are required when the source field is
  const partialPick: DeepPick<Api, "id" | "orders.total"> = { id: "u1" };
  // @ts-expect-error - readonly is preserved on picked fields
  summary.id = "u2";
  void leaky;
  void partialPick;
}

export const compileOnly = [checkDeepReadonly, checkDeepMutable, checkDeepPartial, checkDeepRequired, checkDeepPick];

console.log(`challenge01: ${compileOnly.length} compile-time suites type-checked (run tsgo --noEmit for the verdict)`);
