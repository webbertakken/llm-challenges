import { DeepReadonly, DeepMutable, DeepPartial, DeepRequired, DeepPick } from "./types.js";

type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

/**
 * DeepReadonly Tests
 */
type Original = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
  };
};

type ReadonlyRes = DeepReadonly<Original>;

function testReadonly(obj: ReadonlyRes) {
  // @ts-expect-error
  obj.a.b.c = 10;
  // @ts-expect-error
  obj.a.b.d.push("test");
}

// Verify Map is ReadonlyMap and its values are also DeepReadonly
type TestReadonlyMap = Expect<Equal<ReadonlyRes["a"]["e"], ReadonlyMap<string, { readonly f: boolean }>>>;

/**
 * DeepMutable Tests
 */
type ReadonlyObj = {
  readonly a: {
    readonly b: number;
  };
  readonly c: ReadonlyArray<string>;
};

type MutableRes = DeepMutable<ReadonlyObj>;

function testMutable(obj: MutableRes) {
  obj.a.b = 2; // Should be allowed
  obj.c.push("new"); // Should be allowed
}

/**
 * DeepPartial Tests
 */
type PartialRes = DeepPartial<Original>;

const partialObj: PartialRes = {
  a: {
    b: {
      c: 1,
    },
  },
}; // Should be allowed even if d and e are missing

/**
 * DeepRequired Tests
 */
type RequiredRes = DeepRequired<PartialRes>;
function testRequired() {
  // @ts-expect-error
  const requiredObj: RequiredRes = { a: { b: { c: 1 } } }; // Should fail because d and e are required
}

/**
 * DeepPick Tests
 */
type PickedRes = DeepPick<Original, "a.b.c" | "a.e">;

type ExpectedPicked = {
  a: {
    b: {
      c: number;
    };
    e: Map<string, { f: boolean }>;
  };
};

type TestPick = Expect<Equal<PickedRes, ExpectedPicked>>;

/**
 * Edge Cases: Primitives
 */
type TestPrimitive = Expect<Equal<DeepReadonly<string>, string>>;

/**
 * Edge Cases: Functions
 */
type Func = (x: number) => string;
type TestFunc = Expect<Equal<DeepReadonly<Func>, Func>>;

/**
 * Edge Cases: Tuples
 */
type Tuple = [string, number];
type ReadonlyTuple = readonly [string, number];
// Note: our DeepReadonly implementation maps over keys, which for tuples includes '0', '1', and array methods.
// Using readonly T[] or ReadonlyArray preserves tuple length but makes it readonly.
type TestTuple = Expect<Equal<DeepReadonly<Tuple>, readonly [string, number]>>;

console.log("All tests passed (at least those that run at runtime)!");
