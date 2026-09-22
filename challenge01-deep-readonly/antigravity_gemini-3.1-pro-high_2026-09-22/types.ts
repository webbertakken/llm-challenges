export type Builtin = Function | Date | Error | RegExp;

export type DeepReadonly<T> = T extends Builtin ? T
  : T extends Map<infer K, infer V> ? ReadonlyMap<K, DeepReadonly<V>>
  : T extends ReadonlyMap<infer K, infer V> ? ReadonlyMap<K, DeepReadonly<V>>
  : T extends Set<infer U> ? ReadonlySet<DeepReadonly<U>>
  : T extends ReadonlySet<infer U> ? ReadonlySet<DeepReadonly<U>>
  : T extends Promise<infer U> ? Promise<DeepReadonly<U>>
  : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

export type DeepMutable<T> = T extends Builtin ? T
  : T extends ReadonlyMap<infer K, infer V> ? Map<K, DeepMutable<V>>
  : T extends Map<infer K, infer V> ? Map<K, DeepMutable<V>>
  : T extends ReadonlySet<infer U> ? Set<DeepMutable<U>>
  : T extends Set<infer U> ? Set<DeepMutable<U>>
  : T extends Promise<infer U> ? Promise<DeepMutable<U>>
  : T extends object ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
  : T;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Map<infer K, infer V> ? Map<K, DeepPartial<V>>
  : T extends ReadonlyMap<infer K, infer V> ? ReadonlyMap<K, DeepPartial<V>>
  : T extends Set<infer U> ? Set<DeepPartial<U>>
  : T extends ReadonlySet<infer U> ? ReadonlySet<DeepPartial<U>>
  : T extends Promise<infer U> ? Promise<DeepPartial<U>>
  : T extends readonly any[] ? { [K in keyof T]: DeepPartial<T[K]> }
  : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export type DeepRequired<T> = T extends Builtin ? T
  : T extends Map<infer K, infer V> ? Map<K, DeepRequired<V>>
  : T extends ReadonlyMap<infer K, infer V> ? ReadonlyMap<K, DeepRequired<V>>
  : T extends Set<infer U> ? Set<DeepRequired<U>>
  : T extends ReadonlySet<infer U> ? ReadonlySet<DeepRequired<U>>
  : T extends Promise<infer U> ? Promise<DeepRequired<U>>
  : T extends object ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : T;

export type DeepPick<T, Paths extends string> = 
  UnionToIntersection<
    Paths extends string ? 
      Paths extends `${infer Key}.${infer Rest}` ? 
        Key extends keyof T ? 
          { [K in Key]: DeepPick<T[K], Rest> } 
        : never
      : Paths extends keyof T ? 
        { [K in Paths]: T[K] } 
      : never
    : never
  > extends infer O ? { [K in keyof O]: O[K] } : never;

type UnionToIntersection<U> = 
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
