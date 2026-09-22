import type { DeepMutable, DeepPartial, DeepPick, DeepReadonly, DeepRequired } from "./types.js";

/* ------------------------------------------------------------------ *
 * Compile-time assertion helpers                                      *
 * ------------------------------------------------------------------ */

/** Asserts a conditional type evaluates to `true`. */
type Expect<T extends true> = T;

/** Structural, invariant equality between two types. */
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

type Fn = (x: number) => string;

type Original = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
  };
  g: {
    h: [string, number];
  };
  fn: Fn;
  n: null;
  u: undefined;
  s: Set<{ tag: string }>;
};

declare const ro: DeepReadonly<Original>;
declare const mut: DeepMutable<DeepReadonly<Original>>;
declare const required: DeepRequired<DeepPartial<Original>>;
declare const picked: DeepPick<Original, "a.b.c">;

/* ------------------------------------------------------------------ *
 * 1. DeepReadonly                                                     *
 * ------------------------------------------------------------------ */

// Primitives, null and undefined at the top level pass straight through.
type R1 = Expect<Equal<DeepReadonly<string>, string>>;
type R2 = Expect<Equal<DeepReadonly<number>, number>>;
type R3 = Expect<Equal<DeepReadonly<boolean>, boolean>>;
type R4 = Expect<Equal<DeepReadonly<symbol>, symbol>>;
type R5 = Expect<Equal<DeepReadonly<bigint>, bigint>>;
type R6 = Expect<Equal<DeepReadonly<null>, null>>;
type R7 = Expect<Equal<DeepReadonly<undefined>, undefined>>;

// Functions are leaves and keep their exact signature.
type R8 = Expect<Equal<DeepReadonly<Fn>, Fn>>;

type RO = DeepReadonly<Original>;
type R9 = Expect<Equal<RO["a"]["b"]["d"], readonly string[]>>;
type R10 = Expect<Equal<RO["a"]["e"], ReadonlyMap<string, { readonly f: boolean }>>>;
type R11 = Expect<Equal<RO["g"]["h"], readonly [string, number]>>;
type R12 = Expect<Equal<RO["s"], ReadonlySet<{ readonly tag: string }>>>;
type R13 = Expect<Equal<RO["fn"], Fn>>;
type R14 = Expect<Equal<RO["n"], null>>;
type R15 = Expect<Equal<RO["u"], undefined>>;

// Tuples stay tuples, not unions.
type R16 = Expect<Equal<DeepReadonly<[string, number]>, readonly [string, number]>>;

/** Compile-only: every line below must be rejected by the compiler. */
function checkReadonlyRejections(): void {
  // @ts-expect-error - top-level property is readonly
  ro.a = { b: { c: 1, d: [] }, e: new Map() };
  // @ts-expect-error - nested property is readonly
  ro.a.b.c = 2;
  // @ts-expect-error - the array is a readonly array, so no push
  ro.a.b.d.push("x");
  // @ts-expect-error - map values are deeply readonly, so ReadonlyMap has no set
  ro.a.e.set("k", { f: true });
  // @ts-expect-error - tuple element is readonly
  ro.g.h[0] = "other";
  // @ts-expect-error - set is a ReadonlySet, so no add
  ro.s.add({ tag: "x" });
}
void checkReadonlyRejections;

/* ------------------------------------------------------------------ *
 * 2. DeepMutable                                                      *
 * ------------------------------------------------------------------ */

type M1 = Expect<Equal<DeepMutable<DeepReadonly<Original>>["a"]["b"]["d"], string[]>>;
type M2 = Expect<Equal<DeepMutable<DeepReadonly<Original>>["a"]["e"], Map<string, { f: boolean }>>>;
type M3 = Expect<Equal<DeepMutable<DeepReadonly<Original>>["g"]["h"], [string, number]>>;
type M4 = Expect<Equal<DeepMutable<DeepReadonly<Original>>["s"], Set<{ tag: string }>>>;
type M5 = Expect<Equal<DeepMutable<ReadonlyMap<string, readonly number[]>>, Map<string, number[]>>>;
type M6 = Expect<Equal<DeepMutable<ReadonlySet<readonly string[]>>, Set<string[]>>>;
type M7 = Expect<Equal<DeepMutable<string>, string>>;
type M8 = Expect<Equal<DeepMutable<null>, null>>;
type M9 = Expect<Equal<DeepMutable<Fn>, Fn>>;

/** Compile-only: stripped readonly really is writable again. */
function checkMutability(): void {
  mut.a.b.d.push("ok");
  mut.a.b.c = 42;
  mut.a.e.set("k", { f: true });
  mut.g.h = ["a", 1];
  mut.s.add({ tag: "x" });
}
void checkMutability;

/* ------------------------------------------------------------------ *
 * 3. DeepPartial                                                      *
 * ------------------------------------------------------------------ */

type P1 = Expect<
  Equal<
    NonNullable<DeepPartial<Original>["a"]>,
    { b?: { c?: number; d?: string[] }; e?: ReadonlyMap<string, { f?: boolean }> }
  >
>;
type P2 = Expect<
  Equal<NonNullable<DeepPartial<{ g: { h: [string, number] } }>["g"]>["h"], [string, number] | undefined>
>;
type P3 = Expect<Equal<DeepPartial<{ xs: [number, string] }>["xs"], [number, string] | undefined>>;
type P4 = Expect<Equal<DeepPartial<string[]>, string[]>>;
type P5 = Expect<Equal<DeepPartial<{ xs: number[] }>["xs"], number[] | undefined>>;
type P6 = Expect<Equal<DeepPartial<string>, string>>;
type P7 = Expect<Equal<DeepPartial<null>, null>>;
type P8 = Expect<Equal<DeepPartial<Fn>, Fn>>;

/** Compile-only: optional properties may be omitted but stay type-checked. */
function checkPartial(): void {
  const missing: DeepPartial<Original> = { a: { b: { c: 1 } } };
  void missing;
  // @ts-expect-error - c must be a number when present
  const badScalar: DeepPartial<Original> = { a: { b: { c: "nope" } } };
  void badScalar;
  // @ts-expect-error - d is a string array, not a number array
  const badArray: DeepPartial<Original> = { a: { b: { d: [1, 2] } } };
  void badArray;
}
void checkPartial;

/* ------------------------------------------------------------------ *
 * 4. DeepRequired                                                     *
 * ------------------------------------------------------------------ */

type Q1 = Expect<Equal<DeepRequired<DeepPartial<Original>>["a"]["b"]["c"], number>>;
type Q2 = Expect<Equal<DeepRequired<DeepPartial<Original>>["a"]["b"]["d"], string[]>>;
type Q3 = Expect<Equal<DeepRequired<DeepPartial<Original>>["a"]["e"], ReadonlyMap<string, { f: boolean }>>>;
type Q4 = Expect<Equal<DeepRequired<{ xs: [number, string] }>["xs"], [number, string]>>;
type Q5 = Expect<Equal<DeepRequired<string>, string>>;
type Q6 = Expect<Equal<DeepRequired<null>, null>>;
type Q7 = Expect<Equal<DeepRequired<Fn>, Fn>>;

/** Compile-only: every optional level is required again. */
function checkRequired(): void {
  required.a.b.c = 1;
  required.a.b.d.push("x");
  // @ts-expect-error - a is required and cannot be omitted
  const missingA: DeepRequired<DeepPartial<Original>> = {};
  void missingA;
  // @ts-expect-error - nested required scalar cannot be undefined
  required.a.b.c = undefined;
  // @ts-expect-error - nested required object cannot be undefined
  required.a.b = undefined;
}
void checkRequired;

/* ------------------------------------------------------------------ *
 * 5. DeepPick                                                         *
 * ------------------------------------------------------------------ */

type Picked = DeepPick<Original, "a.b.c" | "a.e">;
type K1 = Expect<Equal<Picked, { a: { b: { c: number }; e: Map<string, { f: boolean }> } }>>;
type K2 = Expect<Equal<Picked["a"]["b"]["c"], number>>;
type K3 = Expect<Equal<Picked["a"]["e"], Map<string, { f: boolean }>>>;
type K4 = Expect<Equal<DeepPick<Original, "g.h">, { g: { h: [string, number] } }>>;
// Several paths into the same branch merge into one shape:
type K5 = Expect<Equal<DeepPick<Original, "a.b.c" | "a.b.d">, { a: { b: { c: number; d: string[] } } }>>;
// Picking a whole subtree keeps everything below it:
type K6 = Expect<Equal<DeepPick<Original, "a.b">, { a: { b: { c: number; d: string[] } } }>>;
// Unknown paths produce an empty object:
type K7 = Expect<Equal<DeepPick<Original, "nope">, {}>>;
type K8 = Expect<Equal<DeepPick<Original, "a.missing.deep">, {}>>;

/** Compile-only: unpicked siblings really are gone. */
function checkPick(): void {
  // @ts-expect-error - b.d was not picked
  picked.a.b.d;
  // @ts-expect-error - e was not picked
  picked.a.e;
  // @ts-expect-error - the top-level keys were reduced to only "a"
  picked.g;
}
void checkPick;

/* ------------------------------------------------------------------ *
 * Runtime smoke line (every real assertion above is compile-time)     *
 * ------------------------------------------------------------------ */

console.log("challenge01 compile-time type assertions passed");
