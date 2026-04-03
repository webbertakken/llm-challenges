import { DeepReadonly, DeepMutable, DeepPartial, DeepRequired, DeepPick } from './types';

// --- Test 1: DeepReadonly ---
type Original = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
  };
};

type Result = DeepReadonly<Original>;

const obj = {
  a: {
    b: {
      c: 1,
      d: ['s'],
    },
    e: new Map([['key', { f: true }]]),
  },
} as unknown as Result;

// @ts-expect-error: a.b.c is readonly
obj.a.b.c = 2;
// @ts-expect-error: a.b.d is readonly array
obj.a.b.d.push('new');
// @ts-expect-error: a.e is ReadonlyMap
obj.a.e.set('key', { f: false });

// --- Test 2: DeepMutable ---
type MutableOriginal = {
  readonly a: {
    readonly b: {
      readonly c: number;
    };
  };
};

type MutableResult = DeepMutable<MutableOriginal>;

const mutableObj = {
  a: {
    b: {
      c: 1,
    },
  },
} as unknown as MutableResult;

// Should be fine
mutableObj.a.b.c = 2;

// --- Test 3: DeepPartial ---
type RequiredObj = {
  a: {
    b: {
      c: number;
    };
  };
};

type PartialObj = DeepPartial<RequiredObj>;

const partialObj = {
  a: {
    b: {},
  },
} as unknown as PartialObj;

// @ts-expect-error: c is optional
(partialObj.a.b as any).c = 1;

// --- Test 4: DeepRequired ---
type PartialObj2 = {
  a?: {
    b?: {
      c?: number;
    };
  };
};

type RequiredObj2 = DeepRequired<PartialObj2>;

const requiredObj = {
  a: {
    b: {
      c: 1,
    },
  },
} as unknown as RequiredObj2;

// @ts-expect-error: a is required
(requiredObj as any).a = undefined;

// --- Test 5: DeepPick ---
type PickTest = {
  a: {
    b: {
      c: number;
    };
  };
};

// Testing single path
type Picked = DeepPick<PickTest, "a.b.c">;

// @ts-expect-error: c is not directly on a.b
const pickedObj = { a: { b: { c: 1 } } } as unknown as Picked;