/**
 * Recursive utility types for nested object structures.
 *
 * Circular-reference limitation: TypeScript will error with
 * "Type instantiation is excessively deep and possibly infinite"
 * on some mutually recursive types. There is no fully general
 * cycle-breaking at the type level without losing precision, so
 * these utilities assume acyclic (or shallowly cyclic) structures.
 */

type Builtin =
  | Function
  | Date
  | RegExp
  | Error
  | Promise<unknown>;

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

// ---------------------------------------------------------------------------
// DeepReadonly
// ---------------------------------------------------------------------------

export type DeepReadonly<T> = T extends Primitive
  ? T
  : T extends Builtin
    ? T
    : T extends Map<infer K, infer V>
      ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
      : T extends ReadonlyMap<infer K, infer V>
        ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
        : T extends Set<infer U>
          ? ReadonlySet<DeepReadonly<U>>
          : T extends ReadonlySet<infer U>
            ? ReadonlySet<DeepReadonly<U>>
            : T extends readonly unknown[]
              ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
              : T extends object
                ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
                : T;

// ---------------------------------------------------------------------------
// DeepMutable
// ---------------------------------------------------------------------------

export type DeepMutable<T> = T extends Primitive
  ? T
  : T extends Builtin
    ? T
    : T extends Map<infer K, infer V>
      ? Map<DeepMutable<K>, DeepMutable<V>>
      : T extends ReadonlyMap<infer K, infer V>
        ? Map<DeepMutable<K>, DeepMutable<V>>
        : T extends Set<infer U>
          ? Set<DeepMutable<U>>
          : T extends ReadonlySet<infer U>
            ? Set<DeepMutable<U>>
            : T extends readonly unknown[]
              ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
              : T extends object
                ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
                : T;

// ---------------------------------------------------------------------------
// DeepPartial
// ---------------------------------------------------------------------------

export type DeepPartial<T> = T extends Primitive
  ? T
  : T extends Builtin
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
              ? { [K in keyof T]: DeepPartial<T[K]> }
              : T extends object
                ? { [K in keyof T]?: DeepPartial<T[K]> }
                : T;

// ---------------------------------------------------------------------------
// DeepRequired
// ---------------------------------------------------------------------------

export type DeepRequired<T> = T extends Primitive
  ? T
  : T extends Builtin
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
              ? { [K in keyof T]-?: DeepRequired<T[K]> }
              : T extends object
                ? { [K in keyof T]-?: DeepRequired<NonNullable<T[K]>> }
                : T;

// ---------------------------------------------------------------------------
// DeepPick
// ---------------------------------------------------------------------------

type UnionToIntersection<U> = (
  U extends unknown ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never;

type PickOnePath<T, Path extends string> = Path extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? { [K in Key]: PickOnePath<T[Key], Rest> }
    : never
  : Path extends keyof T
    ? { [K in Path]: T[Path] }
    : never;

export type DeepPick<T, Paths extends string> = UnionToIntersection<
  Paths extends infer P
    ? P extends string
      ? PickOnePath<T, P>
      : never
    : never
>;
