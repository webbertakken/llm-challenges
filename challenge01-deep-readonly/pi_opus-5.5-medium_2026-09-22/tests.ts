import type {
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
  Path,
} from "./types.js";

type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
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

type Fn = (x: number) => string;

// ---------------------------------------------------------------- DeepReadonly

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
  Expect<Equal<DeepReadonly<string>, string>>,
  Expect<Equal<DeepReadonly<null>, null>>,
  Expect<Equal<DeepReadonly<undefined>, undefined>>,
  Expect<Equal<DeepReadonly<Fn>, Fn>>,
  Expect<Equal<DeepReadonly<{ fn: Fn }>, { readonly fn: Fn }>>,
  Expect<Equal<DeepReadonly<[string, number]>, readonly [string, number]>>,
  Expect<Equal<DeepReadonly<[{ x: 1 }]>, readonly [{ readonly x: 1 }]>>,
  Expect<Equal<DeepReadonly<Set<{ x: number }>>, ReadonlySet<{ readonly x: number }>>>,
  Expect<Equal<DeepReadonly<Date>, Date>>,
  Expect<Equal<DeepReadonly<{ x: number } | null>, { readonly x: number } | null>>,
  Expect<Equal<DeepReadonly<{ o?: { p: 1 } }>, { readonly o?: { readonly p: 1 } }>>,
];

declare const ro: RO;
// @ts-expect-error top-level property is readonly
ro.a = ro.a;
// @ts-expect-error nested property is readonly
ro.a.b.c = 1;
// @ts-expect-error arrays are readonly
ro.a.b.d.push("x");
// @ts-expect-error array elements are readonly
ro.a.b.d[0] = "x";
// @ts-expect-error maps are readonly
ro.a.e.set("k", { f: true });
// @ts-expect-error map values are readonly
ro.a.e.get("k")!.f = false;

declare const roTuple: DeepReadonly<[string, number]>;
// @ts-expect-error tuple element types are preserved
const tupleWrong: string = roTuple[1];
// @ts-expect-error tuple length is preserved
roTuple[2];

// ---------------------------------------------------------------- DeepMutable

type MU = DeepMutable<RO>;

export type MutableTests = [
  Expect<Equal<MU, Original>>,
  Expect<Equal<DeepMutable<readonly [string, number]>, [string, number]>>,
  Expect<Equal<DeepMutable<ReadonlySet<{ readonly x: 1 }>>, Set<{ x: 1 }>>>,
  Expect<Equal<DeepMutable<number>, number>>,
  Expect<Equal<DeepMutable<Fn>, Fn>>,
];

declare const mu: MU;
mu.a.b.c = 1;
mu.a.b.d.push("x");
mu.a.e.set("k", { f: true });
// @ts-expect-error mutable does not change property types
mu.a.b.c = "one";

// ---------------------------------------------------------------- DeepPartial

type PA = DeepPartial<Original>;

export type PartialTests = [
  Expect<
    Equal<
      PA,
      {
        a?: {
          b?: { c?: number; d?: string[] };
          e?: Map<string, { f?: boolean }>;
        };
      }
    >
  >,
  Expect<Equal<DeepPartial<{ list: { x: number }[] }>, { list?: { x?: number }[] }>>,
  Expect<Equal<DeepPartial<[string, { x: number }]>, [string, { x?: number }]>>,
  Expect<Equal<DeepPartial<string>, string>>,
  Expect<Equal<DeepPartial<null>, null>>,
];

export const partialOk: PA = { a: { b: {} } };
export const partialEmpty: PA = {};
// @ts-expect-error partial still checks property types
export const partialBad: PA = { a: { b: { c: "x" } } };
// @ts-expect-error arrays do not become arrays of optional elements
export const partialArrayBad: DeepPartial<{ d: string[] }> = { d: [undefined] };

// ---------------------------------------------------------------- DeepRequired

export type RequiredTests = [
  Expect<Equal<DeepRequired<PA>, Original>>,
  Expect<Equal<DeepRequired<{ a?: { b?: number[] } }>, { a: { b: number[] } }>>,
  Expect<Equal<DeepRequired<Fn>, Fn>>,
  Expect<Equal<DeepRequired<undefined>, undefined>>,
];

// @ts-expect-error nested properties become required
export const requiredBad: DeepRequired<PA> = { a: { b: { c: 1, d: [] } } };

// ---------------------------------------------------------------- DeepPick

type Picked = DeepPick<Original, "a.b.c" | "a.e">;

export type PickTests = [
  Expect<Equal<Picked, { a: { b: { c: number }; e: Map<string, { f: boolean }> } }>>,
  Expect<Equal<DeepPick<Original, "a.b">, { a: { b: { c: number; d: string[] } } }>>,
  Expect<Equal<DeepPick<{ x?: { y: 1; z: 2 } }, "x.y">, { x?: { y: 1 } }>>,
  Expect<Equal<Path<{ a: { b: 1 } }>, "a" | "a.b">>,
];

export const pickedOk: Picked = { a: { b: { c: 1 }, e: new Map() } };
// @ts-expect-error non-picked properties are excluded
export const pickedBad: Picked = { a: { b: { c: 1, d: [] }, e: new Map() } };
// @ts-expect-error invalid paths are rejected
export type BadPick = DeepPick<Original, "a.x">;

// ---------------------------------------------------------------- Circular types

interface TreeNode {
  value: number;
  children: TreeNode[];
  parent: TreeNode | null;
}

declare const tree: DeepReadonly<TreeNode>;
// @ts-expect-error circular types are handled lazily and stay readonly deep down
tree.children[0]!.parent!.value = 1;

export type CircularTests = [
  Expect<Equal<DeepMutable<DeepReadonly<TreeNode>>["parent"], DeepMutable<DeepReadonly<TreeNode>> | null>>,
  Expect<Equal<DeepPick<TreeNode, "parent.parent.value">["parent"], { parent: { value: number } | null } | null>>,
];

export { tupleWrong };
