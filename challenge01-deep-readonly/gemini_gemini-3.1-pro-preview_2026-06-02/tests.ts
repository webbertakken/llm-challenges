import { DeepReadonly, DeepMutable, DeepPartial, DeepRequired, DeepPick } from "./types.js";

type Original = {
  a: {
    b: {
      c: number;
      d: string[];
      e: [string, number];
    };
    f: Map<string, { g: boolean }>;
    h: Set<{ i: number }>;
  };
  j: string | null;
  k: () => void;
};

// --- DeepReadonly Tests ---
type R = DeepReadonly<Original>;

const r: R = {} as any;
// @ts-expect-error
r.a = {} as any;
// @ts-expect-error
r.a.b.c = 2;
// @ts-expect-error
r.a.b.d.push("x");
// @ts-expect-error
r.a.b.e[0] = "y";
// @ts-expect-error
r.a.f.set("x", { g: true });
// @ts-expect-error
r.a.h.add({ i: 1 });
// Allowed:
const fn: () => void = r.k;

// --- DeepMutable Tests ---
type M = DeepMutable<R>;
const m: M = {} as any;
// Allowed:
m.a.b.c = 2;
m.a.b.d.push("x");
m.a.f.set("x", { g: true });

// --- DeepPartial Tests ---
type P = DeepPartial<Original>;
const p: P = {};
const p2: P = { a: {} };
const p3: P = { a: { b: { c: undefined } } };
// Array methods should still exist and not be optional
// @ts-expect-error
p.a?.b?.d?.push(1); // wrong type pushed
p.a?.b?.d?.push("x"); // correctly works
// Tuple should maintain length but have optional elements
const tupleTest: NonNullable<NonNullable<P["a"]>["b"]>["e"] = []; 

// --- DeepRequired Tests ---
type Req = DeepRequired<P>;
const req: Req = {} as any;
// @ts-expect-error
const req2: Req = { a: {} }; // missing b, f, h

// --- DeepPick Tests ---
type Picked1 = DeepPick<Original, "a.b.c" | "a.f">;
const picked1: Picked1 = {
  a: {
    b: { c: 1 },
    f: new Map()
  }
};
// @ts-expect-error
picked1.a.b.d;
// @ts-expect-error
picked1.j;

type Picked2 = DeepPick<Original, "a" | "a.b">;
const picked2: Picked2 = {
  a: {
    b: { c: 1, d: [], e: ["", 1] },
    f: new Map(),
    h: new Set()
  }
};
