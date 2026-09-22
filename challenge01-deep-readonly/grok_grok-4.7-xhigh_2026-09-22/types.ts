/**
 * Recursive object, array, tuple, Map, and Set transforms.
 *
 * Limitations:
 * - Circular aliases usually work because TypeScript expands them lazily
 *   through property positions (`type Node = { next: Node | null }`).
 *   Forcing a full expansion, or nesting past TypeScript's instantiation
 *   limit (about 50), fails with "type instantiation is excessively deep".
 *   There is no cycle detector.
 * - Functions and constructors are leaves, so properties hanging off a
 *   call signature are not walked.
 * - Date, RegExp, boxed primitives, typed arrays, buffers, URL, and
 *   URLSearchParams are leaves. WeakMap and WeakSet are leaves too:
 *   the lib has no readonly counterpart, and their keys are identity-based.
 * - DeepPick paths are dot-separated strings. A key that itself contains
 *   "." cannot be named. Map and Set entries are not properties; select
 *   the collection as a leaf. On a non-tuple array every numeric segment
 *   means "the element", so "0.a" | "1.b" picks `{ a; b }` of the element.
 *   Tuple indices stay positional.
 */

type Transform = "DeepReadonly" | "DeepMutable" | "DeepPartial" | "DeepRequired";

type IsAny<T> = 0 extends 1 & T ? true : false;

type Primitive = null | undefined | string | number | boolean | bigint | symbol;

/**
 * Primitives are matched before this union. `string` is assignable to the
 * boxed `String` constructor type, and the same is true of the other boxes.
 */
type Leaf =
  | Date
  | RegExp
  | Boolean
  | Number
  | String
  | Symbol
  | BigInt
  | ArrayBuffer
  | SharedArrayBuffer
  | DataView
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array
  | URL
  | URLSearchParams;

/** Fixed, optional, and non-empty rest tuples. Open arrays are not tuples. */
type IsTuple<T> =
  T extends readonly unknown[]
    ? number extends T["length"]
      ? T extends readonly [unknown, ...unknown[]]
        ? true
        : false
      : true
    : false;

type HasEnumerableKeys<T> = [keyof T] extends [never] ? false : true;

type Deep<T, Mode extends Transform> =
  IsAny<T> extends true ? T
  : T extends Primitive ? T
  : T extends Function ? T
  : T extends Promise<infer V> ? Promise<Deep<V, Mode>>
  : T extends Map<infer K, infer V> ?
    Mode extends "DeepReadonly" ?
      ReadonlyMap<Deep<K, Mode>, Deep<V, Mode>>
    : Map<Deep<K, Mode>, Deep<V, Mode>>
  : T extends ReadonlyMap<infer K, infer V> ?
    Mode extends "DeepMutable" ?
      Map<Deep<K, Mode>, Deep<V, Mode>>
    : ReadonlyMap<Deep<K, Mode>, Deep<V, Mode>>
  : T extends Set<infer V> ?
    Mode extends "DeepReadonly" ?
      ReadonlySet<Deep<V, Mode>>
    : Set<Deep<V, Mode>>
  : T extends ReadonlySet<infer V> ?
    Mode extends "DeepMutable" ?
      Set<Deep<V, Mode>>
    : ReadonlySet<Deep<V, Mode>>
  : T extends WeakMap<infer _K, infer _V> ? T
  : T extends WeakSet<infer _V> ? T
  : T extends Leaf ? T
  : T extends readonly unknown[] ?
    IsTuple<T> extends true ?
      ApplyObject<T, Mode>
    : ApplyOpenArray<T, Mode>
  : T extends object ?
    HasEnumerableKeys<T> extends true ?
      ApplyObject<T, Mode>
    : T
  : T;

type ApplyObject<T, Mode extends Transform> =
  Mode extends "DeepReadonly" ? { readonly [K in keyof T]: Deep<T[K], Mode> }
  : Mode extends "DeepMutable" ? { -readonly [K in keyof T]: Deep<T[K], Mode> }
  : Mode extends "DeepPartial" ? { [K in keyof T]?: Deep<T[K], Mode> }
  : { [K in keyof T]-?: Deep<T[K], Mode> };

/**
 * Arrays stay arrays. Readonly is preserved for partial/required and forced
 * for the readonly/mutable modes. Elements are transformed but not made
 * optional — that would turn the array into an open optional tuple.
 */
type ApplyOpenArray<T extends readonly unknown[], Mode extends Transform> =
  Mode extends "DeepReadonly" ? readonly Deep<T[number], Mode>[]
  : Mode extends "DeepMutable" ? Deep<T[number], Mode>[]
  : T extends unknown[] ? Deep<T[number], Mode>[]
  : readonly Deep<T[number], Mode>[];

/**
 * Recursively marks every property, tuple slot, array element, map entry,
 * and set member readonly. Arrays become readonly arrays; tuples stay
 * tuples; `Map`/`Set` become `ReadonlyMap`/`ReadonlySet`.
 */
export type DeepReadonly<T> = Deep<T, "DeepReadonly">;

/** Inverse of {@link DeepReadonly}. Strips readonly from properties, tuples, arrays, maps, and sets. */
export type DeepMutable<T> = Deep<T, "DeepMutable">;

/**
 * Recursively makes every property optional. Tuple slots become optional,
 * matching `Partial<[A, B]>`. Arrays stay arrays of deep-partial elements.
 */
export type DeepPartial<T> = Deep<T, "DeepPartial">;

/** Inverse of {@link DeepPartial}. Removes `?` at every level without turning explicit `| undefined` on required fields into defined types. */
export type DeepRequired<T> = Deep<T, "DeepRequired">;

type PathHead<P extends string> = P extends `${infer H}.${string}` ? H : P;

type PathTail<P extends string, K extends string> = P extends `${K}.${infer R}` ? R : never;

/** Underlying property type with the optional-modifier's `undefined` removed. */
type ValueAt<T, K extends keyof T> = { [P in K]-?: T[P] }[K];

type NumericTails<P extends string> = P extends `${number}.${infer R}` ? R : never;

type WrapArray<T extends readonly unknown[], E> = T extends unknown[] ? E[] : readonly E[];

/**
 * Selects the nested properties named by `Paths` and rebuilds the structure
 * around them. An exact key keeps the original property type (deeper paths
 * under that key are redundant). Unmatched keys are omitted.
 */
export type DeepPick<T, Paths extends string> =
  IsAny<T> extends true ? T
  : T extends unknown ? PickInto<T, Paths>
  : never;

type PickInto<T, Paths extends string> =
  [Paths] extends [never] ? {}
  : T extends null | undefined ? T
  : T extends Primitive | Function | Leaf ? never
  : T extends Promise<unknown> ? {}
  : T extends ReadonlyMap<infer _K, infer _V> ? {}
  : T extends ReadonlySet<infer _V> ? {}
  : T extends WeakMap<infer _K, infer _V> ? {}
  : T extends WeakSet<infer _V> ? {}
  : T extends readonly unknown[] ?
    IsTuple<T> extends true ?
      PickObject<T, Paths>
    : PickOpenArray<T, Paths>
  : T extends object ? PickObject<T, Paths>
  : never;

type PickObject<T, Paths extends string> = {
  [K in keyof T as K extends PathHead<Paths> ? K : never]:
    K extends string ?
      [Extract<Paths, K>] extends [never] ?
        DeepPick<ValueAt<T, K>, PathTail<Paths, K>>
      : T[K]
    : T[K];
};

type PickOpenArray<T extends readonly unknown[], Paths extends string> =
  [PathHead<Paths>] extends [`${number}`] ?
    [Extract<Paths, `${number}`>] extends [never] ?
      WrapArray<T, DeepPick<T[number], NumericTails<Paths>>>
    : WrapArray<T, T[number]>
  : PickObject<T, Paths>;
