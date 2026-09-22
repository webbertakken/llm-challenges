import type {
  DeepMutable,
  DeepPartial,
  DeepPick,
  DeepReadonly,
  DeepRequired,
} from "./types.js";

type Expect<T extends true> = T;

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;

type Original = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
  };
};

type ReadonlyOriginal = {
  readonly a: {
    readonly b: {
      readonly c: number;
      readonly d: readonly string[];
    };
    readonly e: ReadonlyMap<string, { readonly f: boolean }>;
  };
};

type PartialOriginal = {
  a?: {
    b?: {
      c?: number;
      d?: string[];
    };
    e?: Map<string, { f?: boolean }>;
  };
};

type _readmeReadonly = Expect<Equal<DeepReadonly<Original>, ReadonlyOriginal>>;
type _readmeMutableRoundTrip = Expect<Equal<DeepMutable<DeepReadonly<Original>>, Original>>;
type _readmeReadonlyRoundTrip = Expect<
  Equal<DeepReadonly<DeepMutable<ReadonlyOriginal>>, ReadonlyOriginal>
>;
type _readmePartial = Expect<Equal<DeepPartial<Original>, PartialOriginal>>;
type _readmeRequiredRoundTrip = Expect<Equal<DeepRequired<DeepPartial<Original>>, Original>>;
type _readmePick = Expect<
  Equal<
    DeepPick<Original, "a.b.c" | "a.e">,
    { a: { b: { c: number }; e: Map<string, { f: boolean }> } }
  >
>;
type _readmePickOrder = Expect<
  Equal<DeepPick<Original, "a.e" | "a.b.c">, DeepPick<Original, "a.b.c" | "a.e">>
>;

type _primitiveString = Expect<Equal<DeepReadonly<string>, string>>;
type _primitiveLiteral = Expect<Equal<DeepReadonly<"ok">, "ok">>;
type _primitiveNumber = Expect<Equal<DeepMutable<42>, 42>>;
type _primitiveBoolean = Expect<Equal<DeepPartial<boolean>, boolean>>;
type _primitiveBigint = Expect<Equal<DeepRequired<10n>, 10n>>;
type _primitiveSymbol = Expect<Equal<DeepReadonly<symbol>, symbol>>;
type _primitiveNull = Expect<Equal<DeepReadonly<null>, null>>;
type _primitiveUndefined = Expect<Equal<DeepPartial<undefined>, undefined>>;
type _primitiveVoid = Expect<Equal<DeepReadonly<void>, void>>;
type _primitiveUnknown = Expect<Equal<DeepReadonly<unknown>, unknown>>;
type _primitiveNever = Expect<Equal<DeepMutable<never>, never>>;
type _topArray = Expect<Equal<DeepReadonly<number[]>, readonly number[]>>;
type _topReadonlyArray = Expect<Equal<DeepMutable<readonly number[]>, number[]>>;
type _nestedArray = Expect<
  Equal<DeepReadonly<number[][]>, readonly (readonly number[])[]>
>;
type _tuple = Expect<
  Equal<DeepReadonly<[string, { n: number }]>, readonly [string, { readonly n: number }]>
>;
type _tupleMutable = Expect<
  Equal<DeepMutable<readonly [string, { readonly n: number }]>, [string, { n: number }]>
>;
type _tupleLength = Expect<Equal<DeepReadonly<[string, number]>["length"], 2>>;
type _optionalTuple = Expect<
  Equal<DeepReadonly<[string, number?]>, readonly [string, number?]>
>;
type _emptyTuple = Expect<Equal<DeepReadonly<[]>, readonly []>>;
type _restTupleIndex = Expect<
  Equal<
    DeepReadonly<[string, ...{ a: number }[]]>[number],
    string | { readonly a: number }
  >
>;

type _map = Expect<
  Equal<
    DeepReadonly<Map<string, { a: number }>>,
    ReadonlyMap<string, { readonly a: number }>
  >
>;
type _readonlyMap = Expect<
  Equal<
    DeepMutable<ReadonlyMap<string, { readonly a: number }>>,
    Map<string, { a: number }>
  >
>;
type _set = Expect<
  Equal<DeepReadonly<Set<{ a: number }>>, ReadonlySet<{ readonly a: number }>>
>;
type _readonlySet = Expect<
  Equal<DeepMutable<ReadonlySet<{ readonly a: number }>>, Set<{ a: number }>>
>;
type _mapInArray = Expect<
  Equal<
    DeepReadonly<Map<string, { a: number }>[]>,
    readonly ReadonlyMap<string, { readonly a: number }>[]
  >
>;

type Fn = (value: { a: number }) => { b: string };
type WithFn = { id: number; run: Fn; parse<T>(input: string): T };
type _fnPreserved = Expect<Equal<DeepReadonly<WithFn>["run"], Fn>>;
type _fnPartial = Expect<
  Equal<DeepPartial<{ onSave: Fn; meta: { id: string } }>, { onSave?: Fn; meta?: { id?: string } }>
>;

type _union = Expect<
  Equal<
    DeepReadonly<{ a: number } | { b: { c: string } }>,
    { readonly a: number } | { readonly b: { readonly c: string } }
  >
>;
type _nullProp = Expect<Equal<DeepReadonly<{ a: null }>, { readonly a: null }>>;
type _undefinedProp = Expect<
  Equal<DeepRequired<{ a: number | undefined }>, { a: number | undefined }>
>;
type _optionalNull = Expect<Equal<DeepRequired<{ a?: null }>, { a: null }>>;
type _explicitUndefinedPartial = Expect<
  Equal<DeepPartial<{ a: number | undefined }>, { a?: number | undefined }>
>;

type NestedOptional = { a?: { b?: number[]; c: { d?: string } | null } };
type _requiredOptional = Expect<
  Equal<DeepRequired<NestedOptional>, { a: { b: number[]; c: { d: string } | null } }>
>;
type _partialOfRequired = Expect<
  Equal<DeepPartial<DeepRequired<NestedOptional>>, {
    a?: { b?: number[]; c?: { d?: string } | null };
  }>
>;

type AlreadyReadonly = { readonly a: readonly number[]; readonly b: ReadonlySet<string> };
type _readonlyIdempotent = Expect<Equal<DeepReadonly<AlreadyReadonly>, AlreadyReadonly>>;
type _mutableStrips = Expect<
  Equal<DeepMutable<AlreadyReadonly>, { a: number[]; b: Set<string> }>
>;

type Dict = { [key: string]: { a: number } };
type _indexReadonly = Expect<
  Equal<DeepReadonly<Dict>, { readonly [key: string]: { readonly a: number } }>
>;
type _indexPartial = Expect<
  Equal<DeepPartial<Dict>, { [key: string]: { a?: number } | undefined }>
>;
type _indexRequired = Expect<Equal<DeepRequired<DeepPartial<Dict>>, Dict>>;

type OptionalProps = { readonly a?: number; b?: { c: string } };
type _readonlyKeepsOptional = Expect<
  Equal<DeepReadonly<OptionalProps>, { readonly a?: number; readonly b?: { readonly c: string } }>
>;
type _mutableKeepsOptional = Expect<
  Equal<DeepMutable<OptionalProps>, { a?: number; b?: { c: string } }>
>;
type _mapObjectKey = Expect<
  Equal<
    DeepReadonly<Map<{ a: number }, string[]>>,
    ReadonlyMap<{ readonly a: number }, readonly string[]>
  >
>;
type _setOfArrays = Expect<
  Equal<DeepReadonly<Set<string[]>>, ReadonlySet<readonly string[]>>
>;
type _intersection = Expect<
  Equal<
    DeepReadonly<{ a: number } & { b: { c: string } }>,
    { readonly a: number } & { readonly b: { readonly c: string } }
  >
>;
type _partialUnion = Expect<
  Equal<
    DeepPartial<{ a: number } | { b: { c: string } }>,
    { a?: number } | { b?: { c?: string } }
  >
>;
type _singlePath = Expect<
  Equal<DeepPick<Original, "a.b.c">, { a: { b: { c: number } } }>
>;
type _fnTop = Expect<Equal<DeepReadonly<Fn>, Fn>>;
type _nestedTuple = Expect<
  Equal<
    DeepReadonly<{ pair: [string, { n: number }] }>,
    { readonly pair: readonly [string, { readonly n: number }] }
  >
>;

type _emptyObject = Expect<Equal<DeepReadonly<{}>, {}>>;
type _objectType = Expect<Equal<DeepReadonly<object>, object>>;
type _promise = Expect<
  Equal<DeepReadonly<Promise<{ a: number }>>, Promise<{ readonly a: number }>>
>;
type _dateLeaf = Expect<Equal<DeepReadonly<{ at: Date }>, { readonly at: Date }>>;
type _urlLeaf = Expect<Equal<DeepPartial<{ home: URL }>, { home?: URL }>>;

type Branched = {
  a: { b: { c: number; d: string }; e: boolean };
  f: { g: number };
  h: string;
};
type _pickBranches = Expect<
  Equal<
    DeepPick<Branched, "a.b.c" | "a.e" | "f">,
    { a: { b: { c: number }; e: boolean }; f: { g: number } }
  >
>;
type _pickWholeKeyWins = Expect<
  Equal<DeepPick<Branched, "a" | "a.b.c">, { a: Branched["a"] }>
>;
type _pickMissingDropped = Expect<Equal<DeepPick<{ a: number; b: string }, "a" | "nope">, { a: number }>>;
type _pickNone = Expect<Equal<DeepPick<{ a: number }, "z">, {}>>;

type Modifiers = { readonly a?: { readonly b: number; c?: string } };
type _pickModifiers = Expect<
  Equal<DeepPick<Modifiers, "a.b">, { readonly a?: { readonly b: number } }>
>;
type _pickOptionalUnion = Expect<
  Equal<
    DeepPick<{ a: { b: number } | { b: string; c: boolean } }, "a.b">,
    { a: { b: number } | { b: string } }
  >
>;
type _pickNull = Expect<
  Equal<DeepPick<{ a: { b: number } | null }, "a.b">, { a: { b: number } | null }>
>;

type Items = { items: { id: string; name: string; extra: boolean }[] };
type _pickArrayElement = Expect<
  Equal<DeepPick<Items, "items.0.name" | "items.1.id">, { items: { name: string; id: string }[] }>
>;
type _pickReadonlyArray = Expect<
  Equal<
    DeepPick<{ items: readonly { id: string; name: string }[] }, "0.name">,
    {}
  >
>;
type _pickArrayProp = Expect<
  Equal<
    DeepPick<{ items: readonly { id: string; name: string }[] }, "items.0.name">,
    { items: readonly { name: string }[] }
  >
>;

type Pair = { pair: [{ id: number; name: string }, boolean] };
type _pickTupleSlot = Expect<Equal<DeepPick<Pair, "pair.0.id">, { pair: { 0: { id: number } } }>>;
type _pickWholeTuple = Expect<Equal<DeepPick<Pair, "pair">, { pair: Pair["pair"] }>>;

type _partialTuple = Expect<
  Equal<DeepPartial<[string, { a: number }]>, [string?, { a?: number }?]>
>;
type _requiredTuple = Expect<
  Equal<DeepRequired<[string?, { a?: number }?]>, [string, { a: number }]>
>;
type _partialReadonlyArray = Expect<
  Equal<DeepPartial<readonly { a: number }[]>, readonly { a?: number }[]>
>;
type _partialMutableArray = Expect<
  Equal<DeepPartial<{ a: number }[]>, { a?: number }[]>
>;
type _requiredKeepsReadonlyArray = Expect<
  Equal<DeepRequired<readonly { a?: number }[]>, readonly { a: number }[]>
>;

type State = {
  a: { b: number; c: string[] };
  d: [number, { e: boolean }];
  f: Map<string, { g: number }>;
  h: Set<{ i: string }>;
  j: null;
  k: (x: number) => void;
};
type _stateMutableRoundTrip = Expect<Equal<DeepMutable<DeepReadonly<State>>, State>>;
type _stateRequiredRoundTrip = Expect<Equal<DeepRequired<DeepPartial<State>>, State>>;

type ListNode = { value: number; next: ListNode | null };
type FrozenList = DeepReadonly<ListNode>;
type _cycleValue = Expect<Equal<FrozenList["value"], number>>;
type _cycleNext = Expect<Equal<FrozenList["next"], FrozenList | null>>;

declare const frozen: DeepReadonly<Original>;
// @ts-expect-error a is readonly
frozen.a = frozen.a;
// @ts-expect-error nested property is readonly
frozen.a.b.c = 1;
// @ts-expect-error array is readonly
frozen.a.b.d.push("x");
// @ts-expect-error array elements are readonly
frozen.a.b.d[0] = "x";
// @ts-expect-error Map became ReadonlyMap
frozen.a.e.set("k", { f: true });

declare const mapValue: DeepReadonly<Map<string, { n: number }>>;
const readEntry = mapValue.get("k");
if (readEntry) {
  // @ts-expect-error mapped value is readonly
  readEntry.n = 2;
}

declare const setValue: DeepReadonly<Set<{ n: number }>>;
// @ts-expect-error Set became ReadonlySet
setValue.add({ n: 1 });

declare const nestedArr: DeepReadonly<{ xs: { id: number }[] }>;
// @ts-expect-error cannot replace an element
nestedArr.xs[0] = { id: 2 };
// @ts-expect-error element fields are readonly
nestedArr.xs[0].id = 2;
// @ts-expect-error cannot push onto a readonly array
nestedArr.xs.push({ id: 3 });

declare const tupleValue: DeepReadonly<[string, { n: number }]>;
// @ts-expect-error tuple slots are readonly
tupleValue[0] = "a";
// @ts-expect-error tuple length is fixed
const _shortTuple: typeof tupleValue = ["only"];

const _okTuple: DeepReadonly<[string, { n: number }]> = ["a", { n: 1 }];

declare function mutateMap(
  map: DeepMutable<ReadonlyMap<string, { readonly n: number }>>,
): void;
declare const editable: DeepMutable<ReadonlyMap<string, { readonly n: number }>>;
mutateMap(editable);
editable.set("b", { n: 3 });
const editableEntry = editable.get("b");
if (editableEntry) editableEntry.n = 4;

declare const editableArr: DeepMutable<readonly { readonly id: number }[]>;
editableArr.push({ id: 1 });
editableArr[0].id = 2;

const _partialOk: DeepPartial<{ a: { b: number; c: string } }> = { a: { b: 1 } };
const _partialEmpty: DeepPartial<{ a: { b: number } }> = {};
// @ts-expect-error b is a number
const _partialBad: DeepPartial<{ a: { b: number } }> = { a: { b: "no" } };

const _requiredOk: DeepRequired<{ a?: { b?: number } }> = { a: { b: 1 } };
// @ts-expect-error a is required
const _requiredMissing: DeepRequired<{ a?: { b?: number } }> = {};
// @ts-expect-error b is required
const _requiredNested: DeepRequired<{ a?: { b?: number } }> = { a: {} };

declare const picked: DeepPick<Original, "a.b.c" | "a.e">;
const _pickedC: number = picked.a.b.c;
const _pickedMap: Map<string, { f: boolean }> = picked.a.e;
// @ts-expect-error d was not picked
picked.a.b.d;

// @ts-expect-error c is a number
const _badPick: DeepPick<Original, "a.b.c">["a"]["b"]["c"] = "nope";

declare const onlyA: DeepPick<{ a: number; b: string }, "a">;
const _onlyA: number = onlyA.a;
// @ts-expect-error b was not picked
onlyA.b;

declare const frozenList: FrozenList;
const _nodeValue: number = frozenList.value;
const _nodeNext: FrozenList | null = frozenList.next;
// @ts-expect-error circular node is frozen
frozenList.value = 1;
if (frozenList.next) {
  // @ts-expect-error nested cycle is frozen
  frozenList.next.value = 2;
}

declare const callable: DeepReadonly<WithFn>;
const _parsed: boolean = callable.parse<boolean>("1");
callable.run({ a: 1 });
// @ts-expect-error id is readonly
callable.id = 2;

const _leafSatisfies = { at: new Date() } satisfies DeepReadonly<{ at: Date }>;
// @ts-expect-error b is not a string
({ a: { b: "no" } }) satisfies DeepReadonly<{ a: { b: number } }>;
