import {
  DeepReadonly,
  DeepMutable,
  DeepPartial,
  DeepRequired,
  DeepPick,
} from './types.js';

// Equality helper for type assertions
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true
  : false;
type Expect<T extends true> = T;

// --- Test 1: DeepReadonly ---
type Original = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
  };
  fn: (x: number) => string;
  tuple: [string, number];
};

declare const ro: DeepReadonly<Original>;

// Valid reads
const _c: number = ro.a.b.c;
const _d0: string = ro.a.b.d[0]!;
const _fnRes: string = ro.fn(42);
const _t0: string = ro.tuple[0];
const _t1: number = ro.tuple[1];

// @ts-expect-error Cannot assign to 'c' because it is a read-only property.
ro.a.b.c = 123;

// @ts-expect-error Index signature in type 'readonly string[]' only permits reading.
ro.a.b.d[0] = 'new';

// @ts-expect-error Property 'push' does not exist on type 'readonly string[]'.
ro.a.b.d.push('new');

// @ts-expect-error Property 'set' does not exist on type 'ReadonlyMap<...>'.
ro.a.e.set('key', { f: true });

// @ts-expect-error Cannot assign to '0' because it is a read-only property.
ro.tuple[0] = 'changed';

// Primitives and null/undefined pass through
type _TestPrim = Expect<Equal<DeepReadonly<string>, string>>;
type _TestNull = Expect<Equal<DeepReadonly<null>, null>>;
type _TestUndef = Expect<Equal<DeepReadonly<undefined>, undefined>>;

// --- Test 2: DeepMutable ---
type ReadonlyTree = {
  readonly a: {
    readonly b: readonly number[];
    readonly m: ReadonlyMap<string, readonly boolean[]>;
    readonly s: ReadonlySet<string>;
  };
};

declare const mut: DeepMutable<ReadonlyTree>;
mut.a.b[0] = 42;
mut.a.b.push(10);
mut.a.m.set('hello', [true]);
mut.a.s.add('world');

// --- Test 3: DeepPartial ---
type Complex = {
  a: {
    b: {
      c: number;
      items: string[];
    };
  };
  tuple: [number, string];
};

const p1: DeepPartial<Complex> = {};
const p2: DeepPartial<Complex> = {
  a: {
    b: {},
  },
};
const p3: DeepPartial<Complex> = {
  a: {
    b: {
      items: ['ok'],
    },
  },
};
const p4: DeepPartial<Complex> = {
  tuple: [1],
};

// @ts-expect-error Type 'number' is not assignable to type 'string'.
const _pInvalid: DeepPartial<Complex> = { a: { b: { items: [123] } } };

// --- Test 4: DeepRequired ---
type PartialTree = {
  a?: {
    b?: {
      c?: number;
    };
  };
};

// Valid assignment when all properties present
const reqOk: DeepRequired<PartialTree> = {
  a: {
    b: {
      c: 10,
    },
  },
};

// @ts-expect-error Property 'c' is missing in type '{}' but required in type '{ c: number; }'.
const _reqMissingC: DeepRequired<PartialTree> = { a: { b: {} } };

// @ts-expect-error Property 'b' is missing in type '{}' but required in type '{ b: { c: number; }; }'.
const _reqMissingB: DeepRequired<PartialTree> = { a: {} };

// --- Test 5: DeepPick ---
type PickTarget = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
  };
  other: string;
};

type Picked = DeepPick<PickTarget, 'a.b.c' | 'a.e'>;

declare const pickedVal: Picked;
const _pkC: number = pickedVal.a.b.c;
const _pkE: Map<string, { f: boolean }> = pickedVal.a.e;

// @ts-expect-error Property 'd' does not exist on type '{ c: number; }'.
const _pkD = pickedVal.a.b.d;

// @ts-expect-error Property 'other' does not exist on type 'Picked'.
const _pkOther = pickedVal.other;
