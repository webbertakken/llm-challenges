import type { DeepReadonly, DeepMutable, DeepPartial, DeepRequired, DeepPick } from "./types.js";

// ─── Test helpers ──────────────────────────────────────────────────────────────

type Expect<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// ─── Test fixtures ─────────────────────────────────────────────────────────────

type Nested = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
  };
  g: Set<number>;
  h: [string, number];
  fn: (x: number) => string;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DeepReadonly — type-level equality tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type DR = DeepReadonly<Nested>;

// Primitives pass through unchanged
type _dr1 = Expect<Equal<DeepReadonly<string>, string>>;
type _dr2 = Expect<Equal<DeepReadonly<number>, number>>;
type _dr3 = Expect<Equal<DeepReadonly<boolean>, boolean>>;
type _dr4 = Expect<Equal<DeepReadonly<null>, null>>;
type _dr5 = Expect<Equal<DeepReadonly<undefined>, undefined>>;

// Functions remain unchanged
type _dr6 = Expect<Equal<DR["fn"], (x: number) => string>>;

// Tuple remains a tuple (readonly)
type _dr7 = Expect<Equal<DeepReadonly<[string, number]>, readonly [string, number]>>;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DeepMutable — type-level equality tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type Frozen = {
  readonly a: {
    readonly b: readonly number[];
  };
  readonly m: ReadonlyMap<string, { readonly x: number }>;
  readonly s: ReadonlySet<string>;
};

type DM = DeepMutable<Frozen>;

// Primitives pass through
type _dm1 = Expect<Equal<DeepMutable<string>, string>>;
type _dm2 = Expect<Equal<DeepMutable<null>, null>>;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DeepPartial — type-level equality tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type DP = DeepPartial<Nested>;

// All properties are optional — these compile because everything is optional
const dp1: DP = {};
const dp2: DP = { a: {} };
const dp3: DP = { a: { b: {} } };
const dp4: DP = { a: { b: { c: 42 } } };

// Arrays remain arrays (not optional-element tuples)
const dp5: DP = { a: { b: { d: ["hello", "world"] } } };

// Primitives pass through
type _dp1 = Expect<Equal<DeepPartial<string>, string>>;
type _dp2 = Expect<Equal<DeepPartial<null>, null>>;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DeepRequired — type-level equality tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type OptionalNested = {
  a?: {
    b?: {
      c?: number;
    };
  };
  d?: string;
};

type DReq = DeepRequired<OptionalNested>;

// Valid when all properties present
const dreq3: DReq = { a: { b: { c: 42 } }, d: "hello" };

// Primitives pass through
type _dreq1 = Expect<Equal<DeepRequired<string>, string>>;
type _dreq2 = Expect<Equal<DeepRequired<undefined>, undefined>>;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DeepPick — type-level equality tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Pick a single deep path
type Pick1 = DeepPick<Nested, "a.b.c">;
type _pk1 = Expect<Equal<Pick1, { a: { b: { c: number } } }>>;

// Pick a top-level key (keeps entire subtree)
type Pick2 = DeepPick<Nested, "a.e">;
type _pk2 = Expect<Equal<Pick2, { a: { e: Map<string, { f: boolean }> } }>>;

// Pick multiple paths
type Pick3 = DeepPick<Nested, "a.b.c" | "a.e">;
type _pk3 = Expect<Equal<Pick3, { a: { b: { c: number }; e: Map<string, { f: boolean }> } }>>;

// Pick top-level only
type Pick4 = DeepPick<Nested, "fn">;
type _pk4 = Expect<Equal<Pick4, { fn: (x: number) => string }>>;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Compile-time-only tests (never called at runtime)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function _compileTimeOnlyTests() {
  // ── DeepReadonly rejects mutation ──

  const dr = null as unknown as DR;
  // @ts-expect-error — cannot assign to readonly property 'a'
  dr.a = {} as any;
  // @ts-expect-error — cannot assign to readonly property 'g'
  dr.g = new Set();
  // @ts-expect-error — cannot assign to readonly property 'b'
  dr.a.b = {} as any;
  // @ts-expect-error — cannot assign to readonly property 'c'
  dr.a.b.c = 1;
  // @ts-expect-error — property 'push' does not exist on readonly array
  dr.a.b.d.push("x");
  // @ts-expect-error — property 'set' does not exist on ReadonlyMap
  dr.a.e.set("x", { f: true });
  // @ts-expect-error — property 'add' does not exist on ReadonlySet
  dr.g.add(1);

  // ── DeepMutable allows mutation ──

  const dm = null as unknown as DM;
  dm.a = { b: [1] };
  dm.a.b = [2, 3];
  dm.a.b.push(4);
  dm.m.set("k", { x: 1 });
  dm.s.add("x");

  // Round-trip: DeepMutable<DeepReadonly<T>> restores mutability
  type RoundTrip = DeepMutable<DeepReadonly<{ a: number[]; b: Map<string, number> }>>;
  const rt = null as unknown as RoundTrip;
  rt.a.push(1);
  rt.b.set("k", 1);

  // ── DeepPartial rejects wrong types ──

  // @ts-expect-error — Type 'string' is not assignable to type 'number | undefined'
  const dp6: DP = { a: { b: { c: "not a number" } } };

  // ── DeepRequired rejects missing properties ──

  // @ts-expect-error — property 'a' is missing
  const dreq1: DReq = { d: "hello" };
  // @ts-expect-error — property 'b' is missing
  const dreq2: DReq = { a: {}, d: "hello" };

  // ── DeepPick rejects unpicked properties ──

  const picked = null as unknown as Pick1;
  // @ts-expect-error — property 'd' does not exist on picked type
  picked.a.b.d;
  // @ts-expect-error — property 'e' does not exist on picked type
  picked.a.e;
}

console.log("All compile-time tests passed!");
