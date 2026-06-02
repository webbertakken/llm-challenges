type Primitive = string | number | boolean | bigint | symbol | undefined | null;
type Builtin = Primitive | Function | Date | Error | RegExp;

export type DeepReadonly<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends ReadonlyMap<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends Set<infer U>
  ? ReadonlySet<DeepReadonly<U>>
  : T extends ReadonlySet<infer U>
  ? ReadonlySet<DeepReadonly<U>>
  : T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends Promise<infer U>
  ? Promise<DeepReadonly<U>>
  : T extends {}
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : Readonly<T>;

export type DeepMutable<T> = T extends Builtin
  ? T
  : T extends ReadonlyMap<infer K, infer V>
  ? Map<DeepMutable<K>, DeepMutable<V>>
  : T extends ReadonlySet<infer U>
  ? Set<DeepMutable<U>>
  : T extends readonly (infer U)[]
  ? DeepMutable<U>[]
  : T extends {}
  ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
  : T;

export type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
  ? Map<DeepPartial<K>, DeepPartial<V>>
  : T extends Set<infer U>
  ? Set<DeepPartial<U>>
  : T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends {}
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

export type DeepRequired<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
  ? Map<DeepRequired<K>, DeepRequired<V>>
  : T extends Set<infer U>
  ? Set<DeepRequired<U>>
  : T extends (infer U)[]
  ? DeepRequired<U>[]
  : T extends {}
  ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : Required<T>;

// Helper for DeepPick: Split string by '.'
type Path<S extends string> = S extends `${infer T}.${infer U}`
  ? [T, ...Path<U>]
  : [S];

// Helper for DeepPick: The recursive implementation
type DeepPickImpl<T, P extends any[]> =
  T extends (infer E)[] ? DeepPickImpl<E, P>[] :
  T extends readonly (infer E)[] ? readonly DeepPickImpl<E, P>[] :
  T extends object ? (
    P extends [infer K, ...infer R]
    ? K extends keyof T
      ? { [key in K]: R[0] extends string ? DeepPickImpl<T[K], R> : T[K] }
      : never
    : T
) : T;

// Combines the picked properties into a single object
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

export type DeepPick<T, K extends string> = UnionToIntersection<{ [P in K]: DeepPickImpl<T, Path<P>> }[K]>;
