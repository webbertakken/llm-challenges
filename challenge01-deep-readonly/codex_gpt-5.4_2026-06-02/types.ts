/**
 * Circular/self-referential object types are supported only to the extent that
 * TypeScript's recursive instantiation limits allow. Very deep cycles may hit
 * the compiler recursion ceiling.
 */

type Primitive = bigint | boolean | null | number | string | symbol | undefined;
type Builtin = Date | Error | Function | Primitive | RegExp;
type IsOptionalKey<T, K extends keyof T> = {} extends Pick<T, K> ? true : false;

type MergeShape<T> = T extends Builtin
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<MergeShape<K>, MergeShape<V>>
    : T extends Map<infer K, infer V>
      ? Map<MergeShape<K>, MergeShape<V>>
      : T extends ReadonlySet<infer V>
        ? ReadonlySet<MergeShape<V>>
        : T extends Set<infer V>
          ? Set<MergeShape<V>>
          : T extends readonly unknown[]
            ? { [K in keyof T]: MergeShape<T[K]> }
            : T extends object
              ? { [K in keyof T]: MergeShape<T[K]> }
              : T;

type PickPath<T, Path extends string> = Path extends `${infer Head}.${infer Tail}`
  ? Head extends keyof NonNullable<T>
    ? IsOptionalKey<NonNullable<T>, Head> extends true
      ? { [K in Head]?: PickPath<NonNullable<NonNullable<T>[Head]>, Tail> }
      : { [K in Head]: PickPath<NonNullable<NonNullable<T>[Head]>, Tail> }
    : never
  : Path extends keyof NonNullable<T>
    ? IsOptionalKey<NonNullable<T>, Path> extends true
      ? { [K in Path]?: NonNullable<T>[Path] }
      : { [K in Path]: NonNullable<T>[Path] }
    : never;

type UnionToIntersection<T> = (
  T extends unknown ? (value: T) => void : never
) extends (value: infer I) => void
  ? I
  : never;

export type DeepReadonly<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
    ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
      : T extends Set<infer V>
        ? ReadonlySet<DeepReadonly<V>>
        : T extends ReadonlySet<infer V>
          ? ReadonlySet<DeepReadonly<V>>
          : T extends readonly unknown[]
            ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
            : T extends object
              ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
              : T;

export type DeepMutable<T> = T extends Builtin
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? Map<DeepMutable<K>, DeepMutable<V>>
    : T extends Map<infer K, infer V>
      ? Map<DeepMutable<K>, DeepMutable<V>>
      : T extends ReadonlySet<infer V>
        ? Set<DeepMutable<V>>
        : T extends Set<infer V>
          ? Set<DeepMutable<V>>
          : T extends readonly unknown[]
            ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
            : T extends object
              ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
              : T;

export type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
    ? Map<DeepPartial<K>, DeepPartial<V>>
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<DeepPartial<K>, DeepPartial<V>>
      : T extends Set<infer V>
        ? Set<DeepPartial<V>>
        : T extends ReadonlySet<infer V>
          ? ReadonlySet<DeepPartial<V>>
          : T extends readonly [unknown, ...unknown[]]
            ? { [K in keyof T]?: DeepPartial<T[K]> }
            : T extends readonly unknown[]
              ? Array<DeepPartial<T[number]>>
              : T extends object
                ? { [K in keyof T]?: DeepPartial<T[K]> }
                : T;

export type DeepRequired<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
    ? Map<DeepRequired<K>, DeepRequired<V>>
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<DeepRequired<K>, DeepRequired<V>>
      : T extends Set<infer V>
        ? Set<DeepRequired<V>>
        : T extends ReadonlySet<infer V>
          ? ReadonlySet<DeepRequired<V>>
          : T extends readonly unknown[]
            ? { [K in keyof T]-?: DeepRequired<T[K]> }
            : T extends object
              ? { [K in keyof T]-?: DeepRequired<NonNullable<T[K]>> }
              : T;

export type DeepPick<T, Paths extends string> = MergeShape<
  UnionToIntersection<PickPath<T, Paths>>
>;
