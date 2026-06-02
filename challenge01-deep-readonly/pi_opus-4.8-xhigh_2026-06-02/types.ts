/**
 * Recursive utility types for arbitrarily nested structures.
 *
 * Design notes
 * ------------
 * - All five types are pure type-level constructs; they emit no runtime code.
 * - Recursion terminates at `Primitive`s, functions, and the built-in
 *   `Map`/`Set` containers (whose type parameters are still recursed into).
 * - Arrays and tuples are handled with homomorphic mapped types
 *   (`{ [K in keyof T]: ... }`) which preserve tuple arity, labels and the
 *   `readonly` modifier, so a tuple never collapses into a union array.
 *
 * Circular references
 * -------------------
 * Recursive *interfaces* (e.g. a tree node that references itself) work
 * because TypeScript evaluates them lazily. A type that is structurally
 * infinite at instantiation time can still hit the compiler's recursion
 * limit; in practice the lazy evaluation of interface members avoids this for
 * the usual self-referential data structures.
 */

/** Values that are left untouched by every transformer. */
export type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

/**
 * Matches any function without using `any`. Parameters are `never[]` (the
 * bottom of the parameter-list lattice) so every concrete function signature
 * is assignable to it via contravariance.
 */
export type AnyFunction = (...args: never[]) => unknown;

/* -------------------------------------------------------------------------- */
/* 1. DeepReadonly                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Recursively marks every property, array element, tuple element, `Map`
 * value/key and `Set` element as `readonly`.
 */
export type DeepReadonly<T> = T extends Primitive
  ? T
  : T extends AnyFunction
    ? T
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
      : T extends ReadonlySet<infer U>
        ? ReadonlySet<DeepReadonly<U>>
        : T extends object
          ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
          : T;

/* -------------------------------------------------------------------------- */
/* 2. DeepMutable                                                             */
/* -------------------------------------------------------------------------- */

/** Inverse of {@link DeepReadonly}: strips `readonly` everywhere. */
export type DeepMutable<T> = T extends Primitive
  ? T
  : T extends AnyFunction
    ? T
    : T extends ReadonlyMap<infer K, infer V>
      ? Map<DeepMutable<K>, DeepMutable<V>>
      : T extends ReadonlySet<infer U>
        ? Set<DeepMutable<U>>
        : T extends object
          ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
          : T;

/* -------------------------------------------------------------------------- */
/* 3. DeepPartial                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Recursively makes every property optional. Arrays/tuples stay arrays/tuples
 * (their elements are recursed into but never made optional), and `Map`/`Set`
 * keep their container kind while their type parameters are recursed into.
 */
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

/** Recurse into array/tuple elements without making indices optional. */
type DeepPartialArray<T extends readonly unknown[]> = {
  [K in keyof T]: DeepPartial<T[K]>;
};

/* -------------------------------------------------------------------------- */
/* 4. DeepRequired                                                            */
/* -------------------------------------------------------------------------- */

/** Inverse of {@link DeepPartial}: removes optionality everywhere. */
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

/** Recurse into array/tuple elements while keeping the container shape. */
type DeepRequiredArray<T extends readonly unknown[]> = {
  [K in keyof T]: DeepRequired<T[K]>;
};

/* -------------------------------------------------------------------------- */
/* 5. DeepPick                                                                */
/* -------------------------------------------------------------------------- */

/** The first segment of a dot-path (`"a.b.c"` -> `"a"`). */
type PathHead<P extends string> = P extends `${infer H}.${string}` ? H : P;

/**
 * The remainder of every path in the union `P` that lives under head `H`
 * (`"a.b.c" | "a.e"` under `"a"` -> `"b.c" | "e"`). Distributes over `P`.
 */
type PathTail<P extends string, H extends string> = P extends `${H}.${infer R}`
  ? R
  : never;

/**
 * Pick deeply nested properties from `T` using dot-notation path strings.
 *
 * Paths are grouped by their head segment, so a union like
 * `"a.b.c" | "a.e"` collapses into a single `a` branch instead of an
 * intersection of partial objects. Segments that do not exist on `T` are
 * silently ignored (filtered by `& keyof T`).
 */
export type DeepPick<T, Paths extends string> = {
  [K in PathHead<Paths> & keyof T]: [PathTail<Paths, K & string>] extends [
    never,
  ]
    ? T[K]
    : DeepPick<T[K], PathTail<Paths, K & string>>;
};
