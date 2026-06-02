export type Builtin = string | number | boolean | bigint | symbol | null | undefined | Function | Date | Error | RegExp;

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
  : T extends Promise<infer U>
  ? Promise<DeepReadonly<U>>
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : Readonly<T>;

export type DeepMutable<T> = T extends Builtin
  ? T
  : T extends ReadonlyMap<infer K, infer V>
  ? Map<DeepMutable<K>, DeepMutable<V>>
  : T extends Map<infer K, infer V>
  ? Map<DeepMutable<K>, DeepMutable<V>>
  : T extends ReadonlySet<infer U>
  ? Set<DeepMutable<U>>
  : T extends Set<infer U>
  ? Set<DeepMutable<U>>
  : T extends Promise<infer U>
  ? Promise<DeepMutable<U>>
  : T extends object
  ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
  : T;

export type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
  ? Map<DeepPartial<K>, DeepPartial<V>>
  : T extends ReadonlyMap<infer K, infer V>
  ? ReadonlyMap<DeepPartial<K>, DeepPartial<V>>
  : T extends Set<infer U>
  ? Set<DeepPartial<U>>
  : T extends ReadonlySet<infer U>
  ? ReadonlySet<DeepPartial<U>>
  : T extends Promise<infer U>
  ? Promise<DeepPartial<U>>
  : T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export type DeepRequired<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
  ? Map<DeepRequired<K>, DeepRequired<V>>
  : T extends ReadonlyMap<infer K, infer V>
  ? ReadonlyMap<DeepRequired<K>, DeepRequired<V>>
  : T extends Set<infer U>
  ? Set<DeepRequired<U>>
  : T extends ReadonlySet<infer U>
  ? ReadonlySet<DeepRequired<U>>
  : T extends Promise<infer U>
  ? Promise<DeepRequired<U>>
  : T extends object
  ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : T;

type FirstLevel<Path extends string> = Path extends `${infer K}.${string}` ? K : Path;
type RestPath<Path extends string, K extends string> = Path extends `${K}.${infer Rest}` ? Rest : never;

export type DeepPick<T, Paths extends string> = T extends Builtin
  ? T
  : {
      [K in keyof T as K extends FirstLevel<Paths> ? K : never]: 
        K extends Paths 
          ? T[K]
          : DeepPick<T[K], RestPath<Paths, Extract<K, string>>>
    };
