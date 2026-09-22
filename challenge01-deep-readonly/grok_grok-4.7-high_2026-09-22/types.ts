/**
 * Recursive utility types for nested object structures.
 *
 * Limitations:
 * - Recursion is lazy, so ordinary circular aliases (a property whose type
 *   mentions the alias again) usually resolve. Instantiation deeper than
 *   TypeScript's limit, or a cycle that expands inside a single conditional,
 *   still reports "Type instantiation is excessively deep and possibly infinite."
 * - Call signatures are treated as leaves. A hybrid object that is both callable
 *   and has data properties is left unchanged, not walked.
 * - DeepPick uses "." as the path separator, so a key that itself contains "."
 *   cannot be named. Numeric index paths ("items.0.id") are not supported.
 * - A DeepPick path that matches nothing resolves to `never`.
 */

type Primitive = null | undefined | string | number | boolean | bigint | symbol | void;

type Builtin =
  | Primitive
  | Date
  | RegExp
  | Error
  | ArrayBuffer
  | SharedArrayBuffer
  | DataView;

type TypedArray =
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
  | BigUint64Array;

type AnyFunction = (...args: never[]) => unknown;

type IsAny<T> = 0 extends 1 & T ? true : false;

/** `Map` has `set`; `ReadonlyMap` does not. Avoids `any` in the constraint. */
type IsMutableMap<T> = T extends {
  set(key: never, value: never): unknown;
}
  ? true
  : false;

/** `Set` has `add`; `ReadonlySet` does not. */
type IsMutableSet<T> = T extends { add(value: never): unknown } ? true : false;

type ImmutableMap<K, V> = ReadonlyMap<K, V>;
type ImmutableSet<V> = ReadonlySet<V>;

export type DeepReadonly<T> =
  IsAny<T> extends true ? T : DeepReadonlyBody<T>;

type DeepReadonlyBody<T> =
  T extends Builtin
    ? T
    : T extends TypedArray
      ? T
      : T extends AnyFunction
        ? T
        : T extends WeakMap<infer K, infer V>
          ? WeakMap<K, DeepReadonly<V>>
          : T extends WeakSet<infer V>
            ? WeakSet<V>
            : T extends ReadonlyMap<infer K, infer V>
              ? ImmutableMap<DeepReadonly<K>, DeepReadonly<V>>
              : T extends ReadonlySet<infer V>
                ? ImmutableSet<DeepReadonly<V>>
                : T extends Promise<infer V>
                  ? Promise<DeepReadonly<V>>
                  : T extends object
                    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
                    : T;

export type DeepMutable<T> = IsAny<T> extends true ? T : DeepMutableBody<T>;

type DeepMutableBody<T> =
  T extends Builtin
    ? T
    : T extends TypedArray
      ? T
      : T extends AnyFunction
        ? T
        : T extends WeakMap<infer K, infer V>
          ? WeakMap<K, DeepMutable<V>>
          : T extends WeakSet<infer V>
            ? WeakSet<V>
            : T extends ReadonlyMap<infer K, infer V>
              ? Map<DeepMutable<K>, DeepMutable<V>>
              : T extends ReadonlySet<infer V>
                ? Set<DeepMutable<V>>
                : T extends Promise<infer V>
                  ? Promise<DeepMutable<V>>
                  : T extends object
                    ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
                    : T;

export type DeepPartial<T> = IsAny<T> extends true ? T : DeepPartialBody<T>;

type DeepPartialBody<T> =
  T extends Builtin
    ? T
    : T extends TypedArray
      ? T
      : T extends AnyFunction
        ? T
        : T extends WeakMap<infer K, infer V>
          ? WeakMap<K, DeepPartial<V>>
          : T extends WeakSet<infer V>
            ? WeakSet<V>
            : T extends ReadonlyMap<infer K, infer V>
              ? IsMutableMap<T> extends true
                ? Map<DeepPartial<K>, DeepPartial<V>>
                : ImmutableMap<DeepPartial<K>, DeepPartial<V>>
              : T extends ReadonlySet<infer V>
                ? IsMutableSet<T> extends true
                  ? Set<DeepPartial<V>>
                  : ImmutableSet<DeepPartial<V>>
                : T extends Promise<infer V>
                  ? Promise<DeepPartial<V>>
                  : T extends readonly unknown[]
                    ? DeepPartialElements<T>
                    : T extends object
                      ? { [K in keyof T]?: DeepPartial<T[K]> }
                      : T;

/**
 * Homomorphic map without `?`, so tuples stay tuples and arrays stay arrays
 * instead of becoming partial-element tuples.
 */
type DeepPartialElements<T extends readonly unknown[]> = {
  [K in keyof T]: DeepPartial<T[K]>;
};

export type DeepRequired<T> = IsAny<T> extends true ? T : DeepRequiredBody<T>;

type DeepRequiredBody<T> =
  T extends Builtin
    ? T
    : T extends TypedArray
      ? T
      : T extends AnyFunction
        ? T
        : T extends WeakMap<infer K, infer V>
          ? WeakMap<K, DeepRequired<V>>
          : T extends WeakSet<infer V>
            ? WeakSet<V>
            : T extends ReadonlyMap<infer K, infer V>
              ? IsMutableMap<T> extends true
                ? Map<DeepRequired<K>, DeepRequired<V>>
                : ImmutableMap<DeepRequired<K>, DeepRequired<V>>
              : T extends ReadonlySet<infer V>
                ? IsMutableSet<T> extends true
                  ? Set<DeepRequired<V>>
                  : ImmutableSet<DeepRequired<V>>
                : T extends Promise<infer V>
                  ? Promise<DeepRequired<V>>
                  : T extends readonly unknown[]
                    ? DeepRequiredElements<T>
                    : T extends object
                      ? { [K in keyof T]-?: DeepRequired<Exclude<T[K], undefined>> }
                      : T;

/** `-?` makes optional tuple slots required without collapsing the tuple. */
type DeepRequiredElements<T extends readonly unknown[]> = {
  [K in keyof T]-?: DeepRequired<Exclude<T[K], undefined>>;
};

type UnionToIntersection<U> =
  (U extends unknown ? (arg: U) => void : never) extends (arg: infer I) => void
    ? I
    : never;

type PickPath<T, Path extends string> =
  Path extends `${infer Head}.${infer Rest}`
    ? Head extends keyof T
      ? {
          [K in keyof T as K extends Head ? K : never]: PickPath<
            Exclude<T[K], undefined>,
            Rest
          >;
        }
      : never
    : Path extends keyof T
      ? { [K in keyof T as K extends Path ? K : never]: T[K] }
      : never;

/** Flatten intersections produced by merging sibling paths into one object type. */
type Normalize<T> =
  IsAny<T> extends true
    ? T
    : T extends Builtin
      ? T
      : T extends TypedArray
        ? T
        : T extends AnyFunction
          ? T
          : T extends WeakMap<infer K, infer V>
            ? WeakMap<K, V>
            : T extends WeakSet<infer V>
              ? WeakSet<V>
              : T extends ReadonlyMap<infer K, infer V>
                ? IsMutableMap<T> extends true
                  ? Map<K, V>
                  : ImmutableMap<K, V>
                : T extends ReadonlySet<infer V>
                  ? IsMutableSet<T> extends true
                    ? Set<V>
                    : ImmutableSet<V>
                  : T extends Promise<infer V>
                    ? Promise<V>
                    : T extends readonly unknown[]
                      ? { [K in keyof T]: Normalize<T[K]> }
                      : T extends object
                        ? { [K in keyof T]: Normalize<T[K]> }
                        : T;

export type DeepPick<T, Paths extends string> =
  IsAny<T> extends true ? T : DeepPickBody<T, Paths>;

type DeepPickBody<T, Paths extends string> = T extends unknown
  ? T extends Builtin
    ? T
    : Normalize<
        UnionToIntersection<
          Paths extends unknown
            ? Paths extends string
              ? PickPath<T, Paths>
              : never
            : never
        >
      >
  : never;
