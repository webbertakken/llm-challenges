// ─────────────────────────────────────────────
// Challenge 01 — Compile-time test harness
// Uses `// @ts-expect-error` to prove types reject invalid assignments.
// ─────────────────────────────────────────────

import type {
  DeepReadonly,
  DeepMutable,
  DeepPartial,
  DeepRequired,
  DeepPick,
} from "./types.ts";

// ── Type-level assertion helper ──
type Assert<T extends true> = T;
type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// ─────────────────────────────────────────────
// 1. DeepReadonly tests
// ─────────────────────────────────────────────

type NestedObj = {
  a: {
    b: { c: number; d: string[] };
    e: Map<string, { f: boolean }>;
  };
};

type DR_Nested = DeepReadonly<NestedObj>;

// ✅ Structure should match expected readonly shape
type _Test1 = Assert<
  Equal<DR_Nested["a"]["b"]["c"], number>
>;
type _Test2 = Assert<
  Equal<DR_Nested["a"]["b"]["d"], readonly string[]>
>;
type _Test3 = Assert<
  Equal<DR_Nested["a"]["e"], ReadonlyMap<string, { readonly f: boolean }>>
>;

// ✅ Should allow reading
const _dr1: DR_Nested = {
  a: {
    b: { c: 42, d: ["hello"] },
    e: new Map([["key", { f: true }]]),
  },
};

// ❌ Should NOT allow writing to nested property
declare const drConst: DR_Nested;
// @ts-expect-error — a.b.c is readonly
drConst.a.b.c = 100;

// ❌ Should NOT allow pushing to readonly array
// @ts-expect-error — d is readonly string[]
drConst.a.b.d.push("world");

// ❌ Should NOT allow writing into Map value
// @ts-expect-error — f is readonly
drConst.a.e.get("key")!.f = false;

// ── Edge: primitives pass through ──
type _DR_Str = Assert<Equal<DeepReadonly<string>, string>>;
type _DR_Null = Assert<Equal<DeepReadonly<null>, null>>;
type _DR_Undef = Assert<Equal<DeepReadonly<undefined>, undefined>>;
type _DR_Num = Assert<Equal<DeepReadonly<number>, number>>;

// ── Edge: functions unchanged ──
type WithFn = { handler: (x: number) => void };
type DR_Fn = DeepReadonly<WithFn>;
type _DR_FnCheck = Assert<Equal<DR_Fn["handler"], (x: number) => void>>;

// ── Edge: tuples preserved as tuples ──
type TupleType = [string, number];
type DR_Tuple = DeepReadonly<TupleType>;
type _TupleLen = Assert<Equal<DR_Tuple["length"], 2>>;
type _TupleShape = Assert<Equal<DR_Tuple, readonly [string, number]>>;

// ❌ Cannot write to tuple element
declare const drTuple: DR_Tuple;
// @ts-expect-error — tuple element is readonly
drTuple[0] = "world";

// ─────────────────────────────────────────────
// 2. DeepMutable tests
// ─────────────────────────────────────────────

type RO_Input = {
  readonly x: {
    readonly y: readonly number[];
    readonly z: ReadonlyMap<string, { readonly w: boolean }>;
  };
};

type DM_Result = DeepMutable<RO_Input>;

// ✅ Structure should be mutable
type _DM1 = Assert<Equal<DM_Result["x"]["y"], number[]>>;
type _DM2 = Assert<Equal<DM_Result["x"]["z"], Map<string, { w: boolean }>>>;

// ✅ Should allow mutation
declare const dm: DM_Result;
dm.x.y.push(1);
dm.x.z.set("k", { w: true });
dm.x.z.get("k")!.w = false;

// ── Round-trip: DeepMutable<DeepReadonly<T>> should be assignable to T ──
type RoundTrip = DeepMutable<DeepReadonly<NestedObj>>;
const _rt: NestedObj = {} as RoundTrip;

// ── Tuple round-trip ──
type RO_Tuple = readonly [string, number];
type MutableTuple = DeepMutable<RO_Tuple>;
type _MT_Check = Assert<Equal<MutableTuple, [string, number]>>;

// ─────────────────────────────────────────────
// 3. DeepPartial tests
// ─────────────────────────────────────────────

type FullConfig = {
  database: {
    host: string;
    port: number;
    credentials: {
      user: string;
      pass: string;
    };
  };
  logging: {
    level: "info" | "debug" | "error";
  };
};

type DP_Config = DeepPartial<FullConfig>;

// ✅ Should allow partial specification
const _dp1: DP_Config = {};
const _dp2: DP_Config = { database: { host: "localhost" } };
const _dp3: DP_Config = {
  database: {
    credentials: { user: "admin" },
  },
};

// ✅ Empty object should be valid
const _dpEmpty: DP_Config = {};

// ── Edge: arrays stay arrays (not optional-element) ──
type WithArray = { items: number[] };
type DP_Arr = DeepPartial<WithArray>;
type _ArrCheck = Assert<Equal<DP_Arr["items"], number[] | undefined>>;

// ── Edge: tuples preserved ──
type PartialTuple = DeepPartial<{ t: [string, number] }>;
type _PT_Check = Assert<Equal<PartialTuple["t"], [string, number] | undefined>>;

// ── Primitives ──
type _DP_Str = Assert<Equal<DeepPartial<string>, string>>;

// ─────────────────────────────────────────────
// 4. DeepRequired tests
// ─────────────────────────────────────────────

type PartialInput = {
  a?: {
    b?: {
      c?: string;
    };
  };
};

type DR_Required = DeepRequired<PartialInput>;

// ✅ All properties should be required (not optional)
type _DR_Req1 = Assert<Equal<DR_Required, { a: { b: { c: string } } }>>;

declare const drReq: DR_Required;
// No optional chaining needed — all props are required
const _len: number = drReq.a.b.c.length;

// ❌ Should NOT allow omitting properties
// @ts-expect-error — b.c is required
const _drBad: DR_Required = { a: { b: {} } };

// ── Round-trip ──
type NoOptional = { x: string; y: number };
type RT2 = DeepRequired<DeepPartial<NoOptional>>;
const _rt2: NoOptional = {} as RT2;

// ── Primitives ──
type _DR_Big = Assert<Equal<DeepRequired<bigint>, bigint>>;

// ─────────────────────────────────────────────
// 5. DeepPick tests
// ─────────────────────────────────────────────

type APIResponse = {
  user: {
    id: number;
    name: string;
    address: {
      city: string;
      country: string;
      geo: { lat: number; lng: number };
    };
    posts: { title: string; views: number }[];
  };
  meta: {
    page: number;
    total: number;
  };
};

type Picked = DeepPick<APIResponse, "user.name" | "user.address.city" | "meta.page">;

// ✅ Should have the picked structure
declare const picked: Picked;
const _name: string = picked.user.name;
const _city: string = picked.user.address.city;
const _page: number = picked.meta.page;

// ❌ Should NOT have unpicked properties
// @ts-expect-error — user.id was not picked
const _badId = picked.user.id;
// @ts-expect-error — user.address.country was not picked
const _badCountry = picked.user.address.country;
// @ts-expect-error — meta.total was not picked
const _badTotal = picked.meta.total;

// ── DeepPick with Map (top-level path, no dot) ──
type WithMap = {
  cache: Map<string, { data: number; meta: { ts: number } }>;
  config: { debug: boolean };
};

type PickedMap = DeepPick<WithMap, "cache" | "config.debug">;

declare const pm: PickedMap;
const _cache: Map<string, { data: number; meta: { ts: number } }> = pm.cache;
const _dbg: boolean = pm.config.debug;

// @ts-expect-error — config.debug picked, but config.other should not exist
pm.config.other;

// ─────────────────────────────────────────────
// Edge-case summary
// ─────────────────────────────────────────────

// Primitives
type _PR1 = Assert<Equal<DeepReadonly<number>, number>>;
type _PR2 = Assert<Equal<DeepReadonly<boolean>, boolean>>;
type _PR3 = Assert<Equal<DeepPartial<string>, string>>;
type _PR4 = Assert<Equal<DeepRequired<bigint>, bigint>>;

// null / undefined
type _NU1 = Assert<Equal<DeepReadonly<null>, null>>;
type _NU2 = Assert<Equal<DeepPartial<undefined>, undefined>>;
type _NU3 = Assert<Equal<DeepRequired<null>, null>>;

// Functions
type FnType = () => { data: number };
type _FN1 = Assert<Equal<DeepReadonly<FnType>, FnType>>;
type _FN2 = Assert<Equal<DeepMutable<DeepReadonly<FnType>>, FnType>>;

// Circular reference note:
// TypeScript cannot represent truly circular types at the type level without
// causing infinite recursion.  The utilities handle arbitrarily deep *acyclic*
// nesting.  Circular structures at runtime are fine — the type simply won't
// expand past the cycle point.

console.log("All compile-time type tests passed (no runtime output expected).");
