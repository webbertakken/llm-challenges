
import type { Eval } from './solution';

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Debugging
import { Tokenize, ParseExpr } from './solution';
type D1 = Tokenize<"2+3">;
type D2 = ParseExpr<D1>;

// Basic Arithmetic
type Test1 = Expect<Equal<Eval<"2+3">, 5>>;
type Test2 = Expect<Equal<Eval<"10-3">, 7>>;
type Test3 = Expect<Equal<Eval<"4*5">, 20>>;

// Precedence (* before +)
type Test4 = Expect<Equal<Eval<"2+3*4">, 14>>;
type Test5 = Expect<Equal<Eval<"2*3+4">, 10>>;

// Associativity (Left-associative)
type Test6 = Expect<Equal<Eval<"10-2-3">, 5>>; // (10-2)-3 = 5
type Test8 = Expect<Equal<Eval<"100-10-10-10">, 70>>;

// Parentheses
type Test9 = Expect<Equal<Eval<"(2+3)*4">, 20>>;
type Test10 = Expect<Equal<Eval<"4*(2+3)">, 20>>;
type Test11 = Expect<Equal<Eval<"((1+2)*(3+4))">, 21>>;

// Whitespace
type Test12 = Expect<Equal<Eval<" 2 + 3 * 4 ">, 14>>;
type Test13 = Expect<Equal<Eval<" ( 1 + 2 ) * ( 3 + 4 ) ">, 21>>;

// Multi-digit numbers
type Test14 = Expect<Equal<Eval<"10+20">, 30>>;
type Test15 = Expect<Equal<Eval<"123-23">, 100>>;

// Complex nesting
type Test16 = Expect<Equal<Eval<"1+(2*(3+4))">, 15>>;
type Test17 = Expect<Equal<Eval<"(1+2)*3+4">, 13>>;

console.log("Compile-time tests passed!");
