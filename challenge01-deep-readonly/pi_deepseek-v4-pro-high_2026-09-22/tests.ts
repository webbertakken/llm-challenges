/**
 * Compile-time tests for the recursive utility types.
 *
 * Run with: npx tsgo --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext types.ts tests.ts examples.ts
 *
 * Positive checks use the strict-equality `Expect<Equal<...>>` harness.
 * Negative checks are real assignments guarded by `// @ts-expect-error`,
 * proving that mutating a deeply-readonly structure does not type-check.
 */
import type {
  DeepReadonly,
  DeepMutable,
  DeepPartial,
  DeepRequired,
  DeepPick,
} from "./types.js";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------
type Original = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
  };
  g: Set<{ h: number }>;
  tuple: [string, number];
  fn: () => void;
};

// ---------------------------------------------------------------------------
// DeepReadonly
// ---------------------------------------------------------------------------
type ReadonlyOriginal = {
  readonly a: {
    readonly b: {
      readonly c: number;
      readonly d: readonly string[];
    };
    readonly e: ReadonlyMap<string, { readonly f: boolean }>;
  };
  readonly g: ReadonlySet<{ readonly h: number }>;
  readonly tuple: readonly [string, number];
  readonly fn: () => void;
};

type _readonly = Expect<Equal<DeepReadonly<Original>, ReadonlyOriginal>>;
type _readonly_primitive = Expect<Equal<DeepReadonly<string>, string>>;
type _readonly_nullish = Expect<Equal<DeepReadonly<null | undefined>, null | undefined>>;
type _readonly_function = Expect<Equal<DeepReadonly<() => void>, () => void>>;

declare const readonlyState: DeepReadonly<Original>;
// @ts-expect-error - nested object property is readonly
readonlyState.a.b.c = 42;
// @ts-expect-error - nested array element is readonly
readonlyState.a.b.d.push("x");
// @ts-expect-error - Map is a ReadonlyMap (no set)
readonlyState.a.e.set("k", { f: true });
// @ts-expect-error - Set is a ReadonlySet (no add)
readonlyState.g.add({ h: 1 });
// @ts-expect-error - tuple element is readonly
readonlyState.tuple[0] = "y";
// @ts-expect-error - top-level property is readonly
readonlyState.a = { b: { c: 1, d: [] }, e: new Map() };

// ---------------------------------------------------------------------------
// DeepMutable
// ---------------------------------------------------------------------------
type MutableOriginal = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
  };
  g: Set<{ h: number }>;
  tuple: [string, number];
  fn: () => void;
};

type _mutable = Expect<Equal<DeepMutable<DeepReadonly<Original>>, MutableOriginal>>;

declare const mutableState: DeepMutable<DeepReadonly<Original>>;
mutableState.a.b.c = 42;
mutableState.a.b.d.push("x");
mutableState.a.e.set("k", { f: true });
mutableState.g.add({ h: 1 });
mutableState.tuple[0] = "y";

// ---------------------------------------------------------------------------
// DeepPartial
// ---------------------------------------------------------------------------
type PartialOriginal = {
  a?: {
    b?: {
      c?: number;
      d?: string[];
    };
    e?: Map<string, { f?: boolean }>;
  };
  g?: Set<{ h?: number }>;
  tuple?: [string, number];
  fn?: () => void;
};

type _partial = Expect<Equal<DeepPartial<Original>, PartialOriginal>>;
type _partial_primitive = Expect<Equal<DeepPartial<string | null>, string | null>>;

declare const partialState: DeepPartial<Original>;
// @ts-expect-error - top-level property may be undefined
const _partialCheck: { a: object } = partialState;

// ---------------------------------------------------------------------------
// DeepRequired (the exact inverse of DeepPartial)
// ---------------------------------------------------------------------------
type _required = Expect<Equal<DeepRequired<PartialOriginal>, Original>>;
type _required_primitive = Expect<Equal<DeepRequired<string | null>, string | null>>;

// ---------------------------------------------------------------------------
// DeepPick
// ---------------------------------------------------------------------------
type Picked = DeepPick<Original, "a.b.c" | "a.e">;
type ExpectedPicked = {
  a: {
    b: { c: number };
    e: Map<string, { f: boolean }>;
  };
};
type _pick = Expect<Equal<Picked, ExpectedPicked>>;

type PickedSingle = DeepPick<Original, "a.b.d">;
type _pick_single = Expect<Equal<PickedSingle, { a: { b: { d: string[] } } }>>;

type PickedTop = DeepPick<Original, "tuple" | "fn">;
type _pick_top = Expect<Equal<PickedTop, { tuple: [string, number]; fn: () => void }>>;

// ---------------------------------------------------------------------------
// Runtime guard: this file must never execute any of the above (types only).
// ---------------------------------------------------------------------------
export {};
