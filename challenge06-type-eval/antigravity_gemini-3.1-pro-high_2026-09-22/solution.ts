// solution.ts - Type-level arithmetic evaluator

export type Whitespace = ' ' | '\n' | '\r' | '\t';

// Lexer: Tokenize the input string into a tuple of tokens
export type Lex<S extends string, Acc extends string[] = [], Curr extends string = ""> =
  S extends `${infer Char}${infer Rest}`
    ? Char extends Whitespace
      ? Curr extends ""
        ? Lex<Rest, Acc, "">
        : Lex<Rest, [...Acc, Curr], "">
      : Char extends "+" | "-" | "*" | "(" | ")"
        ? Curr extends ""
          ? Lex<Rest, [...Acc, Char], "">
          : Lex<Rest, [...Acc, Curr, Char], "">
        : Lex<Rest, Acc, `${Curr}${Char}`>
    : Curr extends ""
      ? Acc
      : [...Acc, Curr];

// Parse string to number
export type ToNumber<S extends string> = S extends `${infer N extends number}` ? N : never;

// Type-level arithmetic utilities via tuple lengths
export type TupleOf<N extends number, Acc extends any[] = []> = Acc['length'] extends N ? Acc : TupleOf<N, [...Acc, 1]>;

export type Add<A extends number, B extends number> = [...TupleOf<A>, ...TupleOf<B>]['length'] & number;

export type Sub<A extends number, B extends number> = TupleOf<A> extends [...TupleOf<B>, ...infer Rest] ? Rest['length'] & number : never;

export type Mul<A extends number, B extends number, Acc extends any[] = []> = 
  TupleOf<B> extends [any, ...infer RestB] 
    ? Mul<A, RestB['length'] & number, [...Acc, ...TupleOf<A>]> 
    : Acc['length'] & number;

// Parser and Evaluator: Recursive Descent Parser
// Grammar:
// expr   = term (("+" | "-") term)*
// term   = factor ("*" factor)*
// factor = number | "(" expr ")"

export type ParseExpr<Tokens extends string[]> = ParseTerm<Tokens> extends [infer TermVal extends number, infer Rest1 extends string[]]
  ? ParseExprSeq<Rest1, TermVal>
  : never;

export type ParseExprSeq<Tokens extends string[], Acc extends number> = Tokens extends [infer Op, ...infer Rest extends string[]]
  ? Op extends "+"
    ? ParseTerm<Rest> extends [infer TermVal extends number, infer Rest1 extends string[]]
      ? ParseExprSeq<Rest1, Extract<Add<Acc, TermVal>, number>>
      : never
    : Op extends "-"
      ? ParseTerm<Rest> extends [infer TermVal extends number, infer Rest1 extends string[]]
        ? ParseExprSeq<Rest1, Extract<Sub<Acc, TermVal>, number>>
        : never
      : [Acc, Tokens]
  : [Acc, Tokens];

export type ParseTerm<Tokens extends string[]> = ParseFactor<Tokens> extends [infer FactVal extends number, infer Rest1 extends string[]]
  ? ParseTermSeq<Rest1, FactVal>
  : never;

export type ParseTermSeq<Tokens extends string[], Acc extends number> = Tokens extends [infer Op, ...infer Rest extends string[]]
  ? Op extends "*"
    ? ParseFactor<Rest> extends [infer FactVal extends number, infer Rest1 extends string[]]
      ? ParseTermSeq<Rest1, Extract<Mul<Acc, FactVal>, number>>
      : never
    : [Acc, Tokens]
  : [Acc, Tokens];

export type ParseFactor<Tokens extends string[]> = Tokens extends [infer T1, ...infer Rest extends string[]]
  ? T1 extends "("
    ? ParseExpr<Rest> extends [infer ExprVal extends number, infer Rest1 extends string[]]
      ? Rest1 extends [")", ...infer Rest2 extends string[]]
        ? [ExprVal, Rest2]
        : never
      : never
    : T1 extends string
      ? [ToNumber<T1>, Rest]
      : never
  : never;

// Main Evaluator Entry Point
export type Eval<S extends string> = ParseExpr<Lex<S>> extends [infer Result extends number, []] ? Result : never;
