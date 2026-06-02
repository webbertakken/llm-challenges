/**
 * Challenge 01 — Deep Readonly & Recursive Utility Types
 *
 * A suite of recursive, type-level utilities that operate on arbitrarily
 * nested object structures (objects, arrays, tuples, Maps and Sets).
 *
 * Design notes / shared conventions:
 *  - `Primitive` values, `null`, `undefined` and functions always pass through
 *    unchanged. They are the recursion terminators.
 *  - Maps and Sets are recognised before plain objects (they *are* objects)
 *    and are rebuilt with their key/value/element types transformed.
 *  - Arrays are distinguished from tuples via the `number extends T["length"]`
 *    test, so tuples keep their fixed shape instead of collapsing to a
 *    homogeneous element array.
 *
 * Circular reference limitation:
 *  TypeScript evaluates these conditional/mapped types lazily for *named*
 *  recursive interfaces (e.g. `interface Tree { children: Tree[] }`), so those
 *  work fine. A structurally self-referential *type alias* expanded eagerly can
 *  still hit the "Type instantiation is excessively deep" limiter — this is an
 *  inherent compiler constraint, not specific to these utilities.
 */

/** Recursion terminators: anything that should be returned as-is. */
export type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

/** Matches any callable. Functions are left untouched by every utility. */
export type AnyFunction = (...args: never[]) => unknown;

/** True when `T` is a fixed-length tuple rather than a variadic array. */
type IsTuple<T extends readonly unknown[]> = number extends T["length"]
  ? false
  : true;

/* ------------------------------------------------------------------ *
 * 1. DeepReadonly
 * ------------------------------------------------------------------ */

export type DeepReadonly<T> = T extends Primitive
  ? T
  : T extends AnyFunction
    ? T
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
      : T extends ReadonlySet<infer U>
        ? ReadonlySet<DeepReadonly<U>>
        : T extends readonly unknown[]
          ? DeepReadonlyArray<T>
          : T extends object
            ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
            : T;

type DeepReadonlyArray<T extends readonly unknown[]> = IsTuple<T> extends true
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : ReadonlyArray<DeepReadonly<T[number]>>;

/* ------------------------------------------------------------------ *
 * 2. DeepMutable (inverse of DeepReadonly)
 * ------------------------------------------------------------------ */

export type DeepMutable<T> = T extends Primitive
  ? T
  : T extends AnyFunction
    ? T
    : T extends ReadonlyMap<infer K, infer V>
      ? Map<DeepMutable<K>, DeepMutable<V>>
      : T extends ReadonlySet<infer U>
        ? Set<DeepMutable<U>>
        : T extends readonly unknown[]
          ? DeepMutableArray<T>
          : T extends object
            ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
            : T;

type DeepMutableArray<T extends readonly unknown[]> = IsTuple<T> extends true
  ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
  : Array<DeepMutable<T[number]>>;

/* ------------------------------------------------------------------ *
 * 3. DeepPartial
 * ------------------------------------------------------------------ */

export type DeepPartial<T> = T extends Primitive
  ? T
  : T extends AnyFunction
    ? T
    : T extends Map<infer K, infer V>
      ? Map<DeepPartial<K>, DeepPartial<V>>
      : T extends ReadonlyMap<infer K, infer V>
        ? ReadonlyMap<DeepPartial<K>, DeepPartial<V>>
        : T extends Set<infer U>
          ? Set<DeepPartial<U>>
          : T extends ReadonlySet<infer U>
            ? ReadonlySet<DeepPartial<U>>
            : T extends readonly unknown[]
              ? DeepPartialArray<T>
              : T extends object
                ? { [K in keyof T]?: DeepPartial<T[K]> }
                : T;

// Arrays stay arrays (never collapse to optional-element tuples); only their
// elements recurse. Tuples keep their shape but each position becomes optional.
type DeepPartialArray<T extends readonly unknown[]> = IsTuple<T> extends true
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T extends readonly (infer U)[]
    ? T extends unknown[]
      ? Array<DeepPartial<U>>
      : ReadonlyArray<DeepPartial<U>>
    : never;

/* ------------------------------------------------------------------ *
 * 4. DeepRequired (inverse of DeepPartial)
 * ------------------------------------------------------------------ */

export type DeepRequired<T> = T extends Primitive
  ? T
  : T extends AnyFunction
    ? T
    : T extends Map<infer K, infer V>
      ? Map<DeepRequired<K>, DeepRequired<V>>
      : T extends ReadonlyMap<infer K, infer V>
        ? ReadonlyMap<DeepRequired<K>, DeepRequired<V>>
        : T extends Set<infer U>
          ? Set<DeepRequired<U>>
          : T extends ReadonlySet<infer U>
            ? ReadonlySet<DeepRequired<U>>
            : T extends readonly unknown[]
              ? DeepRequiredArray<T>
              : T extends object
                ? { [K in keyof T]-?: DeepRequired<T[K]> }
                : T;

type DeepRequiredArray<T extends readonly unknown[]> = IsTuple<T> extends true
  ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : T extends readonly (infer U)[]
    ? T extends unknown[]
      ? Array<DeepRequired<U>>
      : ReadonlyArray<DeepRequired<U>>
    : never;

/* ------------------------------------------------------------------ *
 * 5. DeepPick (dot-notation path picking)
 * ------------------------------------------------------------------ */

/** Collapse a union into an intersection. */
type UnionToIntersection<U> = (
  U extends unknown ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never;

/** Recursively flatten intersections into plain objects without touching
 *  primitives, functions, arrays, Maps or Sets. */
type Simplify<T> = T extends Primitive
  ? T
  : T extends AnyFunction
    ? T
    : T extends Map<infer K, infer V>
      ? Map<Simplify<K>, Simplify<V>>
      : T extends ReadonlyMap<infer K, infer V>
        ? ReadonlyMap<Simplify<K>, Simplify<V>>
        : T extends Set<infer U>
          ? Set<Simplify<U>>
          : T extends ReadonlySet<infer U>
            ? ReadonlySet<Simplify<U>>
            : T extends readonly unknown[]
              ? T
              : T extends object
                ? { [K in keyof T]: Simplify<T[K]> }
                : T;

/** Build the nested object described by a single dot-path. */
type PathToObject<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? { [K in Head]: PathToObject<T[K], Rest> }
    : never
  : P extends keyof T
    ? { [K in P]: T[K] }
    : never;

export type DeepPick<T, Paths extends string> = Simplify<
  UnionToIntersection<Paths extends string ? PathToObject<T, Paths> : never>
>;
