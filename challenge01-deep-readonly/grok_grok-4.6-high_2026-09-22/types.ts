/**
 * Recursive utility types for arbitrarily nested object structures.
 *
 * Circular-reference limitation: TypeScript cannot represent truly cyclic
 * object graphs at the type level. Applying these types to a self-referential
 * interface (e.g. `interface Node { child: Node }`) is supported via deferred
 * expansion, but mutually recursive aliases or very deep trees can hit
 * "Type instantiation is excessively deep and possibly infinite".
 */

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

type Builtin =
  | Primitive
  | Date
  | RegExp
  | Error
  | Function
  | Promise<unknown>;

type IsTuple<T> = T extends readonly unknown[]
  ? number extends T["length"]
    ? false
    : true
  : false;

/**
 * Recursively make every property of `T` (and nested objects, arrays,
 * tuples, Maps, and Sets) readonly. Primitives, null, undefined, functions,
 * and other builtins pass through unchanged.
 */
export type DeepReadonly<T> = T extends Primitive
  ? T
  : T extends (...args: never[]) => unknown
    ? T
    : T extends Map<infer K, infer V>
      ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
      : T extends ReadonlyMap<infer K, infer V>
        ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
        : T extends Set<infer U>
          ? ReadonlySet<DeepReadonly<U>>
          : T extends ReadonlySet<infer U>
            ? ReadonlySet<DeepReadonly<U>>
            : T extends WeakMap<infer K, infer V>
              ? WeakMap<K, DeepReadonly<V>>
              : T extends WeakSet<infer U>
                ? WeakSet<U>
                : T extends Promise<infer U>
                  ? Promise<DeepReadonly<U>>
                  : T extends Builtin
                    ? T
                    : T extends readonly unknown[]
                      ? IsTuple<T> extends true
                        ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
                        : ReadonlyArray<DeepReadonly<T[number]>>
                      : T extends object
                        ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
                        : T;

/**
 * Inverse of {@link DeepReadonly}: strip `readonly` recursively from every
 * property, array, Map, and Set.
 */
export type DeepMutable<T> = T extends Primitive
  ? T
  : T extends (...args: never[]) => unknown
    ? T
    : T extends Map<infer K, infer V>
      ? Map<DeepMutable<K>, DeepMutable<V>>
      : T extends ReadonlyMap<infer K, infer V>
        ? Map<DeepMutable<K>, DeepMutable<V>>
        : T extends Set<infer U>
          ? Set<DeepMutable<U>>
          : T extends ReadonlySet<infer U>
            ? Set<DeepMutable<U>>
            : T extends WeakMap<infer K, infer V>
              ? WeakMap<K, DeepMutable<V>>
              : T extends WeakSet<infer U>
                ? WeakSet<U>
                : T extends Promise<infer U>
                  ? Promise<DeepMutable<U>>
                  : T extends Builtin
                    ? T
                    : T extends readonly unknown[]
                      ? IsTuple<T> extends true
                        ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
                        : Array<DeepMutable<T[number]>>
                      : T extends object
                        ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
                        : T;

/**
 * Recursively make every property optional. Arrays stay arrays (they are not
 * rewritten as optional-element tuples). Tuple structure is preserved.
 */
export type DeepPartial<T> = T extends Primitive
  ? T
  : T extends (...args: never[]) => unknown
    ? T
    : T extends Map<infer K, infer V>
      ? Map<K, DeepPartial<V>>
      : T extends ReadonlyMap<infer K, infer V>
        ? ReadonlyMap<K, DeepPartial<V>>
        : T extends Set<infer U>
          ? Set<DeepPartial<U>>
          : T extends ReadonlySet<infer U>
            ? ReadonlySet<DeepPartial<U>>
            : T extends WeakMap<infer K, infer V>
              ? WeakMap<K, DeepPartial<V>>
              : T extends WeakSet<infer U>
                ? WeakSet<U>
                : T extends Promise<infer U>
                  ? Promise<DeepPartial<U>>
                  : T extends Builtin
                    ? T
                    : T extends readonly unknown[]
                      ? IsTuple<T> extends true
                        ? { [K in keyof T]: DeepPartial<T[K]> }
                        : Array<DeepPartial<T[number]>>
                      : T extends object
                        ? { [K in keyof T]?: DeepPartial<T[K]> }
                        : T;

/**
 * Inverse of {@link DeepPartial}: recursively make every property required.
 */
export type DeepRequired<T> = T extends Primitive
  ? T
  : T extends (...args: never[]) => unknown
    ? T
    : T extends Map<infer K, infer V>
      ? Map<K, DeepRequired<V>>
      : T extends ReadonlyMap<infer K, infer V>
        ? ReadonlyMap<K, DeepRequired<V>>
        : T extends Set<infer U>
          ? Set<DeepRequired<U>>
          : T extends ReadonlySet<infer U>
            ? ReadonlySet<DeepRequired<U>>
            : T extends WeakMap<infer K, infer V>
              ? WeakMap<K, DeepRequired<V>>
              : T extends WeakSet<infer U>
                ? WeakSet<U>
                : T extends Promise<infer U>
                  ? Promise<DeepRequired<U>>
                  : T extends Builtin
                    ? T
                    : T extends readonly unknown[]
                      ? IsTuple<T> extends true
                        ? { [K in keyof T]-?: DeepRequired<T[K]> }
                        : Array<DeepRequired<T[number]>>
                      : T extends object
                        ? { [K in keyof T]-?: DeepRequired<T[K]> }
                        : T;

type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

type DeepPickOne<T, Path extends string> = Path extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? { [K in Key]: DeepPickOne<T[K], Rest> }
    : never
  : Path extends keyof T
    ? { [P in Path]: T[P] }
    : never;

/**
 * Pick deeply nested properties using dot-notation path strings.
 *
 * @example
 * type Picked = DeepPick<Original, "a.b.c" | "a.e">;
 * // { a: { b: { c: number }; e: Map<string, { f: boolean }> } }
 */
export type DeepPick<T, Paths extends string> = UnionToIntersection<
  Paths extends infer P
    ? P extends string
      ? DeepPickOne<T, P>
      : never
    : never
> extends infer I
  ? { [K in keyof I]: I[K] }
  : never;
