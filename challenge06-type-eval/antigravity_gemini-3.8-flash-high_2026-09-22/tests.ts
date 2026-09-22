import type { Eval } from './solution.js';

type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true
  : false;
type Expect<T extends true> = T;

// 1. Operator Precedence (* before + and -)
type _Precedence1 = Expect<Equal<Eval<'2+3*4'>, 14>>;
type _Precedence2 = Expect<Equal<Eval<'2*3+4'>, 10>>;
type _Precedence3 = Expect<Equal<Eval<'20-2*3'>, 14>>;
type _Precedence4 = Expect<Equal<Eval<'3*4-2'>, 10>>;

// 2. Left-Associativity for + and -
type _Assoc1 = Expect<Equal<Eval<'10-2-3'>, 5>>;
type _Assoc2 = Expect<Equal<Eval<'20-5-5-5'>, 5>>;
type _Assoc3 = Expect<Equal<Eval<'10-5+2'>, 7>>;
type _Assoc4 = Expect<Equal<Eval<'1+2+3+4'>, 10>>;

// 3. Parentheses & Overriding Precedence
type _Parens1 = Expect<Equal<Eval<'(2+3)*4'>, 20>>;
type _Parens2 = Expect<Equal<Eval<'4*(2+3)'>, 20>>;
type _Parens3 = Expect<Equal<Eval<'(10-3)*(2+1)'>, 21>>;

// 4. Arbitrary Nesting of Parentheses
type _Nesting1 = Expect<Equal<Eval<'((1+2)*(3+4))'>, 21>>;
type _Nesting2 = Expect<Equal<Eval<'(((5)))'>, 5>>;
type _Nesting3 = Expect<Equal<Eval<'((2+3)*(4+(1*2)))'>, 30>>;

// 5. Whitespace Insensitivity (spaces, tabs, irregular padding)
type _Whitespace1 = Expect<Equal<Eval<'  2  +  3  *  4  '>, 14>>;
type _Whitespace2 = Expect<Equal<Eval<'\t(\t2 + 3\t)\t*\t4\t'>, 20>>;
type _Whitespace3 = Expect<Equal<Eval<' ( ( 1 + 2 ) * ( 3 + 4 ) ) '>, 21>>;

// 6. Multi-digit Operands
type _MultiDigit1 = Expect<Equal<Eval<'100+25'>, 125>>;
type _MultiDigit2 = Expect<Equal<Eval<'12*12'>, 144>>;
type _MultiDigit3 = Expect<Equal<Eval<'200-50-25'>, 125>>;

// 7. Operations with Zero
type _Zero1 = Expect<Equal<Eval<'0*10'>, 0>>;
type _Zero2 = Expect<Equal<Eval<'10*0'>, 0>>;
type _Zero3 = Expect<Equal<Eval<'0+0'>, 0>>;
type _Zero4 = Expect<Equal<Eval<'0+15'>, 15>>;
type _Zero5 = Expect<Equal<Eval<'15-0'>, 15>>;
