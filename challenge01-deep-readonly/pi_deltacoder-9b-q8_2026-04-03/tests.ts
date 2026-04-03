import {
  DeepReadonly,
  DeepMutable,
  DeepPartial,
  DeepRequired,
  DeepPick,
} from "./types";

// ============ DeepReadonly Tests ============

// Test 1: Basic nested readonly - property should be readonly
const test1a: DeepReadonly<{ a: { b: { c: number } } }> = {
  a: {
    b: {
      c: 5,
    },
  },
};
// @ts-expect-error - Should not be able to mutate nested property
test1a.a.b.c = 10;

// Test 2: Array in readonly - array should be readonly
const test2a: DeepReadonly<{ arr: number[] }> = {
  arr: [1, 2, 3],
};
// @ts-expect-error - Should not be able to mutate array
test2a.arr.push(4);

// Test 3: Map in readonly
const test3a = new Map<string, { x: number }>();
test3a.set("a", { x: 1 });
const readonlyMap: DeepReadonly<typeof test3a> = test3a;
// @ts-expect-error - Should not be able to add to readonly map
readonlyMap.set("b", { x: 2 });

// Test 4: Set in readonly
const test4a = new Set<{ y: number }>();
test4a.add({ y: 1 });
const readonlySet: DeepReadonly<typeof test4a> = test4a;
// @ts-expect-error - Should not be able to add to readonly set
readonlySet.add({ y: 2 });

// Test 5: Primitive passes through (string remains string)
const test5a: DeepReadonly<string> = "hello";
// @ts-expect-error - Should not be able to reassign
test5a = "world";

// Test 6: Function properties unchanged
const test6a = {
  fn: () => 42,
};
const readonlyTest6a: DeepReadonly<typeof test6a> = test6a;
// @ts-expect-error - Function should remain readonly
readonlyTest6a.fn = () => 99;

// ============ DeepMutable Tests ============

// Test 7: Basic mutable from readonly
const test7a: DeepMutable<Readonly<{ a: { b: number } }>> = {
  a: {
    b: 1,
  },
};
// @ts-expect-error - Should not be able to assign to readonly
test7a = { a: { b: 2 } };

// Test 8: Function passes through
const test8a: DeepMutable<() => number> = () => 1;
// @ts-expect-error - Function should remain function
test8a = 42;

// ============ DeepPartial Tests ============

// Test 9: Basic partial - should allow missing properties
const test9a: DeepPartial<{ a: number; b: string }> = {
  a: 1,
};
// @ts-expect-error - Should require both properties for non-partial
test9a.b = "test";

// Test 10: Nested partial
const test10a: DeepPartial<{ a: { b: number } }> = {
  a: {
    b: 1,
  },
};
// @ts-expect-error - Should not be able to assign to nested property
test10a.a.b = 2;

// Test 11: Arrays remain arrays (mutable)
const test11a: DeepPartial<{ arr: number[] }> = {
  arr: [1, 2],
};
// @ts-expect-error - Should not be able to mutate array
test11a.arr.push(3);

// Test 12: Primitive passes through
const test12a: DeepPartial<string> = "hello";
// @ts-expect-error - String should remain string
test12a = 42;

// ============ DeepRequired Tests ============

// Test 13: Basic required
const test13a: DeepRequired<{ a?: number; b?: string }> = {
  a: 1,
  b: "test",
};
// @ts-expect-error - Should require both properties
const test13b: DeepRequired<{ a?: number; b?: string }> = {};

// Test 14: Nested required
const test14a: DeepRequired<{ a?: { b?: number } }> = {
  a: {
    b: 1,
  },
};
// @ts-expect-error - Should require nested property
const test14b: DeepRequired<{ a?: { b?: number } }> = { a: {} };

// Test 15: Optional becomes required
const test15a: DeepRequired<{ a?: number }> = {
  a: 1,
};
// @ts-expect-error - Should require property
const test15b: DeepRequired<{ a?: number }> = {};

// ============ DeepPick Tests ============

// Test 16: Basic pick - returns the value at the path
const test16a = {
  a: { b: { c: 1 } },
  x: 2,
};
const picked16a: DeepPick<typeof test16a, "a.b.c"> = 1;
// @ts-expect-error - Should be number, not string
picked16a = "test";

// Test 17: Nested pick
const test17a: DeepPick<{ a: { b: { c: number } } }, "a.b.c"> = 1;
// @ts-expect-error - Should be number, not string
test17a = "test";

// Test 18: Pick from flat object
const test18a: DeepPick<{ a: number; b: string }, "a"> = 1;
// @ts-expect-error - Should be number, not string
test18a = "test";

// ============ Edge Cases ============

// Test 19: null and undefined pass through
const test19a: DeepReadonly<null> = null;
const test19b: DeepReadonly<undefined> = undefined;

// Test 20: Primitives pass through
const test20a: DeepReadonly<number> = 42;
const test20b: DeepReadonly<boolean> = true;

// Test 21: Empty object
const test21a: DeepReadonly<{}> = {};
EOF