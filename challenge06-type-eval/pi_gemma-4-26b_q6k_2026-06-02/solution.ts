/**
 * Type-level arithmetic evaluator.
 * 
 * Grammar:
 * expr   = term (("+" | "-") term)*
 * term   = factor ("*" factor)*
 * factor = number | "(" expr ")"
 * number = digit+
 * 
 * Precedence: * > + / -
 * Associativity: left-associative
 */

// --- Basic Utilities ---

type Equals<X, Y> = 
  (<T>() => T extends X ? (Y extends T ? true : false) : false) extends 
  (<T>() => T extends Y ? (X extends T ? true : false) : false) ? true : false;

type IsDigit<S extends string> = S extends `${infer D}` ? (D extends '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' ? true : false) : false;

type Trim<S extends string> = S extends ` ${infer T }` ? Trim<T> : S extends `${infer T } ` ? Trim<T> : S;

// --- Arithmetic via Tuples ---

type MultiplyBy10<T extends any[]> = 
  [...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T];

type AppendDigit<T extends any[], D extends string> = 
  D extends '0' ? MultiplyBy10<T> :
  D extends '1' ? [...MultiplyBy10<T>, any] :
  D extends '2' ? [...MultiplyBy10<T>, any, any] :
  D extends '3' ? [...MultiplyBy10<T>, any, any, any] :
  D extends '4' ? [...MultiplyBy10<T>, any, any, any, any] :
  D extends '5' ? [...MultiplyBy10<T>, any, any, any, any, any] :
  D extends '6' ? [...MultiplyBy10<T>, any, any, any, any, any, any] :
  D extends '7' ? [...MultiplyBy10<T>, any, any, any, any, any, any, any] :
  D extends '8' ? [...MultiplyBy10<T>, any, any, any, any, any, any, any, any] :
  D extends '9' ? [...MultiplyBy10<T>, any, any, any, any, any, any, any, any, any] :
  never;

type StringToTupleInternal<S extends string, Acc extends any[] = []> = 
  S extends `${infer D}${infer Rest}`
    ? D extends '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
      ? StringToTupleInternal<Rest, AppendDigit<Acc, D>>
      : never
    : Acc;

type StringToTupleFinal<S extends string> = 
  S extends "0" ? [] : StringToTupleInternal<S>;

type TupleLengthToString<T extends any[]> = 
  T['length'] extends infer L ? `${L}` : never;

type Add<T extends any[], U extends any[]> = [...T, ...U];
type Sub<T extends any[], U extends any[]> = 
  T extends [...infer Rest, ...U] ? Rest : never;

type Mul<T extends any[], U extends any[]> = 
  U extends [] ? [] :
  U extends [any, ...infer Rest] ? [...T, ...Mul<T, Rest>] :
  never;

// --- Parsing ---

type ParseNumberImpl<S extends string, Acc extends string = ""> = 
  S extends `${infer D}${infer Rest}`
    ? IsDigit<D> extends true
      ? ParseNumberImpl<Rest, `${Acc}${D}`>
      : { value: Acc, rest: S }
    : { value: Acc, rest: S };

type ParseFactorImplFinal<S extends string> = 
  S extends `(${infer Inner})`
    ? ParseExprImpl<Trim<Inner>>
    : ParseNumberImpl<S> extends infer N
      ? N extends { value: infer V, rest: infer R }
        ? { value: StringToTupleFinal<V extends string ? V : "0">, rest: R }
        : never
      : never;

type ParseTermNext<S extends string, Acc extends any[]> = 
  S extends `${infer OpChar}${infer Rest}`
    ? OpChar extends "*"
      ? ParseFactorImplFinal<Trim<Rest>> extends infer Next
        ? Next extends { value: infer V, rest: infer R }
          ? ParseTermNext<R, Mul<Acc, V>>
          : never
        : never
      : { value: Acc, rest: S }
    : { value: Acc, rest: S };

type ParseTermImpl<S extends string> = 
  ParseFactorImplFinal<Trim<S>> extends infer First
    ? First extends { value: infer V, rest: infer R }
      ? ParseTermNext<Trim<R>, V>
      : never
    : never;

type ParseExprNext<S extends string, Acc extends any[]> = 
  S extends `${infer Op}${infer Rest}`
    ? (Op extends "+" 
        ? ParseTermImpl<Trim<Rest>> extends infer Next
          ? Next extends { value: infer V, rest: infer R }
            ? ParseExprNext<R, Add<Acc, V>>
            : never
          : never
        : Op extends "-" 
          ? ParseTermImpl<Trim<Rest>> extends infer Next
            ? Next extends { value: infer V, rest: infer R }
              ? ParseExprNext<R, Sub<Acc, V>>
              : never
          : { value: Acc, rest: S })
    : { value: Acc, rest: S };

type ParseExprImpl<S extends string> = 
  ParseTermImpl<Trim<S>> extends infer First
    ? First extends { value: infer V, rest: infer R }
      ? ParseExprNext<Trim<R>, V>
      : never
    : never;

export type Eval<S extends string> = TupleLengthToString<ParseExprImpl<Trim<S>>['value']>;
