/**
 * Compile-time assertions for `Eval`. Type-check with:
 *   npx tsgo --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext solution.ts tests.ts
 */
import type { Eval } from "./solution.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

// Single numbers
type _n1 = Expect<Equal<Eval<"0">, 0>>;
type _n2 = Expect<Equal<Eval<"7">, 7>>;
type _n3 = Expect<Equal<Eval<"42">, 42>>;
type _n4 = Expect<Equal<Eval<"123">, 123>>;
type _n5 = Expect<Equal<Eval<"007">, 7>>;

// Basic operators
type _o1 = Expect<Equal<Eval<"2+3">, 5>>;
type _o2 = Expect<Equal<Eval<"9-4">, 5>>;
type _o3 = Expect<Equal<Eval<"6*7">, 42>>;
type _o4 = Expect<Equal<Eval<"5-5">, 0>>;
type _o5 = Expect<Equal<Eval<"0*99">, 0>>;

// Precedence: * binds tighter than + and -
type _p1 = Expect<Equal<Eval<"2+3*4">, 14>>;
type _p2 = Expect<Equal<Eval<"2*3+4">, 10>>;
type _p3 = Expect<Equal<Eval<"20-3*4">, 8>>;
type _p4 = Expect<Equal<Eval<"1+2*3+4*5">, 27>>;
type _p5 = Expect<Equal<Eval<"2*3*4+1">, 25>>;

// Left associativity
type _a1 = Expect<Equal<Eval<"10-2-3">, 5>>;
type _a2 = Expect<Equal<Eval<"10-2+3">, 11>>;
type _a3 = Expect<Equal<Eval<"1+2-3+4-2+6">, 8>>;
type _a4 = Expect<Equal<Eval<"2*3*4">, 24>>;
type _a5 = Expect<Equal<Eval<"100-50-25-10">, 15>>;

// Parentheses
type _b1 = Expect<Equal<Eval<"(2+3)*4">, 20>>;
type _b2 = Expect<Equal<Eval<"2*(3+4)">, 14>>;
type _b3 = Expect<Equal<Eval<"(10-2)-3">, 5>>;
type _b4 = Expect<Equal<Eval<"10-(5-3+4)">, 4>>;
type _b5 = Expect<Equal<Eval<"(7)">, 7>>;
type _b6 = Expect<Equal<Eval<"((((7))))">, 7>>;

// Nesting
type _d1 = Expect<Equal<Eval<"((1+2)*(3+4))">, 21>>;
type _d2 = Expect<Equal<Eval<"(1+(2+(3+(4+(5+6)))))">, 21>>;
type _d3 = Expect<Equal<Eval<"((2*3)+(4*5))*(6-4)">, 52>>;
type _d4 = Expect<Equal<Eval<"(((1+1)*(1+1))*((1+1)*(1+1)))*2">, 32>>;
type _d5 = Expect<Equal<Eval<"((((((((1+1))))))))*3">, 6>>;

// Deep nesting and long chains
type _s1 = Expect<Equal<Eval<"((((((((((((((((1+1))))))))))))))))">, 2>>;
type _s2 = Expect<Equal<Eval<"(1+(1+(1+(1+(1+(1+(1+(1+(1+(1+(1+(1+(1+(1+(1+1)))))))))))))))">, 16>>;
type _s3 = Expect<Equal<Eval<"1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1">, 30>>;
type _s4 = Expect<Equal<Eval<"2*2*2*2*2*2*2*2*2">, 512>>;
type _s5 = Expect<Equal<Eval<"((1+2)*((3+4)*((5+6)-(7+(8-5)))))*3">, 63>>;

// Whitespace is insignificant
type _w1 = Expect<Equal<Eval<" 2 + 3 * 4 ">, 14>>;
type _w2 = Expect<Equal<Eval<"( 2 + 3 ) * 4">, 20>>;
type _w3 = Expect<Equal<Eval<"10  -  2  -  3">, 5>>;
type _w4 = Expect<Equal<Eval<"\t12\n*\r3 ">, 36>>;
type _w5 = Expect<Equal<Eval<"   17   ">, 17>>;

// Multi-digit numbers and larger results
type _m1 = Expect<Equal<Eval<"12*12">, 144>>;
type _m2 = Expect<Equal<Eval<"100+200+300">, 600>>;
type _m3 = Expect<Equal<Eval<"25*4-1">, 99>>;
type _m4 = Expect<Equal<Eval<"999-99-9">, 891>>;
type _m5 = Expect<Equal<Eval<"(15+5)*(15+5)">, 400>>;

// Malformed input evaluates to never
type _e1 = Expect<Equal<Eval<"">, never>>;
type _e2 = Expect<Equal<Eval<"2+">, never>>;
type _e3 = Expect<Equal<Eval<"(2+3">, never>>;
type _e4 = Expect<Equal<Eval<"2+3)">, never>>;
type _e5 = Expect<Equal<Eval<"2 x 3">, never>>;
type _e6 = Expect<Equal<Eval<"2 3">, never>>;

// The result is a numeric literal type, usable as a value type
const fourteen: Eval<"2+3*4"> = 14;
// @ts-expect-error 15 is not the value of 2+3*4
const wrong: Eval<"2+3*4"> = 15;
void fourteen;
void wrong;
