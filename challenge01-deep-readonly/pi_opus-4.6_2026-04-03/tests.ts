// Challenge 01 — Compile-time tests
// All @ts-expect-error lines must trigger a TS error on the next line.
// Running `tsc --noEmit` with no errors means all tests pass.

import type { DeepReadonly, DeepMutable, DeepPartial, DeepRequired, DeepPick } from "./types.js";

// ─── Test helpers ──────────────────────────────────────────────────────────────

type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<X>() => X extends A ? 1 : 0) extends (<X>() => X extends B ? 1 : 0) ? true : false;

// ─── Sample types ──────────────────────────────────────────────────────────────

type Original = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
  };
  g: Set<number>;
  h: [string, number];
};

// ═══════════════════════════════════════════════════════════════════════════════
// DeepReadonly
// ═══════════════════════════════════════════════════════════════════════════════

type DR = DeepReadonly<Original>;

// Nested properties become readonly
declare const dr: DR;

// @ts-expect-error — cannot assign to readonly property
dr.a = {} as any;

// @ts-expect-error — cannot assign to deeply nested readonly property
dr.a.b.c = 42;

// @ts-expect-error — readonly array: cannot push
dr.a.b.d.push("x");

// @ts-expect-error — readonly tuple: cannot assign to element
dr.h[0] = "x";

// Map becomes ReadonlyMap — no set method
// @ts-expect-error
dr.a.e.set("x", { f: true });

// Set becomes ReadonlySet — no add method
// @ts-expect-error
dr.g.add(1);

// Primitives pass through
type _DR_Prim1 = Assert<IsEqual<DeepReadonly<string>, string>>;
type _DR_Prim2 = Assert<IsEqual<DeepReadonly<number>, number>>;
type _DR_Prim3 = Assert<IsEqual<DeepReadonly<boolean>, boolean>>;

// null and undefined pass through
type _DR_Null = Assert<IsEqual<DeepReadonly<null>, null>>;
type _DR_Undef = Assert<IsEqual<DeepReadonly<undefined>, undefined>>;

// Functions remain unchanged
type Fn = (x: number) => string;
type _DR_Fn = Assert<IsEqual<DeepReadonly<Fn>, Fn>>;

// Tuples remain tuples
type _DR_Tuple = Assert<IsEqual<DeepReadonly<[string, number]>, readonly [string, number]>>;

// ═══════════════════════════════════════════════════════════════════════════════
// DeepMutable
// ═══════════════════════════════════════════════════════════════════════════════

type Frozen = {
  readonly a: {
    readonly b: {
      readonly c: number;
      readonly d: readonly string[];
    };
    readonly e: ReadonlyMap<string, { readonly f: boolean }>;
  };
  readonly g: ReadonlySet<number>;
};

type DM = DeepMutable<Frozen>;

declare const dm: DM;

// Should be assignable now
dm.a = {} as any;
dm.a.b.c = 42;
dm.a.b.d.push("x");
dm.a.e.set("x", { f: true });
dm.g.add(1);

// Primitives pass through
type _DM_Prim = Assert<IsEqual<DeepMutable<string>, string>>;

// Functions remain unchanged
type _DM_Fn = Assert<IsEqual<DeepMutable<Fn>, Fn>>;

// Round-trip: DeepMutable<DeepReadonly<T>> should restore mutability
type RoundTrip = DeepMutable<DeepReadonly<{ x: number[]; y: Map<string, boolean> }>>;
declare const rt: RoundTrip;
rt.x.push(1);
rt.y.set("a", true);

// ═══════════════════════════════════════════════════════════════════════════════
// DeepPartial
// ═══════════════════════════════════════════════════════════════════════════════

type DP = DeepPartial<Original>;

// All properties become optional
const dp1: DP = {};
const dp2: DP = { a: {} };
const dp3: DP = { a: { b: {} } };
const dp4: DP = { a: { b: { c: 1 } } };

// Arrays remain arrays, not optional-element tuples
type _DP_Arr = Assert<IsEqual<DeepPartial<{ x: string[] }>, { x?: string[] }>>;

// Primitives pass through
type _DP_Prim = Assert<IsEqual<DeepPartial<number>, number>>;

// @ts-expect-error — wrong type should still be rejected
const dpBad: DP = { a: { b: { c: "not a number" } } };

// ═══════════════════════════════════════════════════════════════════════════════
// DeepRequired
// ═══════════════════════════════════════════════════════════════════════════════

type PartialNested = {
  a?: {
    b?: {
      c?: number;
    };
  };
  d?: string;
};

type DReq = DeepRequired<PartialNested>;

// @ts-expect-error — missing required property 'a'
const dreq1: DReq = { d: "x" };

// @ts-expect-error — missing required nested property 'c'
const dreq2: DReq = { a: { b: {} }, d: "x" };

// Valid: all properties provided
const dreq3: DReq = { a: { b: { c: 42 } }, d: "x" };

// Primitives pass through
type _DReq_Prim = Assert<IsEqual<DeepRequired<string>, string>>;

// Round-trip: DeepRequired<DeepPartial<T>> should restore required-ness
type ReqRoundTrip = DeepRequired<DeepPartial<{ x: number; y: { z: boolean } }>>;
type _ReqRT = Assert<IsEqual<ReqRoundTrip, { x: number; y: { z: boolean } }>>;

// ═══════════════════════════════════════════════════════════════════════════════
// DeepPick
// ═══════════════════════════════════════════════════════════════════════════════

type Picked1 = DeepPick<Original, "a.b.c" | "a.e">;

// Should contain a.b.c and a.e, but NOT a.b.d or g or h
type _DP1 = Assert<IsEqual<Picked1, { a: { b: { c: number }; e: Map<string, { f: boolean }> } }>>;

// Pick a single top-level key
type Picked2 = DeepPick<Original, "g">;
type _DP2 = Assert<IsEqual<Picked2, { g: Set<number> }>>;

// Pick multiple nested paths
type Picked3 = DeepPick<Original, "a.b.c" | "a.b.d">;
type _DP3 = Assert<IsEqual<Picked3, { a: { b: { c: number; d: string[] } } }>>;

// @ts-expect-error — picked type should not have unpicked properties
const picked: Picked1 = { a: { b: { c: 1, d: ["oops"] }, e: new Map() } };

console.log("All compile-time tests passed (tsc --noEmit).");
