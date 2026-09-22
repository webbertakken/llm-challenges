/**
 * Compile-time test suite for `Eval`.
 *
 *   npx tsgo --noEmit --strict --target ES2024 --module NodeNext \
 *            --moduleResolution NodeNext solution.ts tests.ts
 *
 * Every assertion is a type alias of the form `Expect<Equals<Eval<…>, N>>`.
 * `Expect<T extends true>` only accepts the literal `true`, and `Equals` is the
 * strict (invariance-based) equality check, so a wrong or widened result is a
 * compile error. A clean type-check IS the passing test run.
 */

import type { Eval } from "./solution.js";

/* ------------------------------ test harness ------------------------------ */

type Equals<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

type Expect<T extends true> = T;
type ExpectNot<T extends false> = T;

/* --------------------------------- 1. atoms ------------------------------- */

type _single = Expect<Equals<Eval<"0">, 0>>;
type _oneDigit = Expect<Equals<Eval<"7">, 7>>;
type _twoDigits = Expect<Equals<Eval<"42">, 42>>;
type _threeDigits = Expect<Equals<Eval<"999">, 999>>;
type _leadingZeros = Expect<Equals<Eval<"007">, 7>>;
type _zeroesOnly = Expect<Equals<Eval<"000">, 0>>;

/* ------------------------ 2. the four worked examples --------------------- */

type _readme1 = Expect<Equals<Eval<"2+3*4">, 14>>;
type _readme2 = Expect<Equals<Eval<"(2+3)*4">, 20>>;
type _readme3 = Expect<Equals<Eval<"10-2-3">, 5>>;
type _readme4 = Expect<Equals<Eval<"((1+2)*(3+4))">, 21>>;

/* ------------------------------ 3. precedence ----------------------------- */

type _mulBeforeAdd = Expect<Equals<Eval<"2+3*4">, 14>>;
type _mulBeforeAddRight = Expect<Equals<Eval<"3*4+2">, 14>>;
type _mulBeforeSub = Expect<Equals<Eval<"20-2*3">, 14>>;
type _mulBetweenAdds = Expect<Equals<Eval<"1+2*3+4">, 11>>;
type _twoProducts = Expect<Equals<Eval<"2*3+4*5">, 26>>;
type _productsAndDiff = Expect<Equals<Eval<"12*12-13*11">, 1>>;
// The wrong answer, i.e. what a left-to-right evaluator would produce.
type _notLeftToRight = ExpectNot<Equals<Eval<"2+3*4">, 20>>;

/* ---------------------------- 4. associativity ---------------------------- */

type _subLeftAssoc = Expect<Equals<Eval<"10-2-3">, 5>>; // (10-2)-3, not 10-(2-3)
type _subChain = Expect<Equals<Eval<"100-50-20-10">, 20>>;
type _addSubMix = Expect<Equals<Eval<"10-3+5">, 12>>; // (10-3)+5, not 10-(3+5)
type _addSubMix2 = Expect<Equals<Eval<"1+10-3+2-4">, 6>>;
type _mulLeftAssoc = Expect<Equals<Eval<"2*3*4">, 24>>;
type _mulChain = Expect<Equals<Eval<"2*3*4*5">, 120>>;
type _notRightAssoc = ExpectNot<Equals<Eval<"10-3+5">, 2>>;

/* ------------------------------ 5. parentheses ---------------------------- */

type _parensOverride = Expect<Equals<Eval<"(2+3)*4">, 20>>;
type _parensRight = Expect<Equals<Eval<"4*(2+3)">, 20>>;
type _parensRedundant = Expect<Equals<Eval<"(7)">, 7>>;
type _parensDeeplyRedundant = Expect<Equals<Eval<"(((((7)))))">, 7>>;
type _parensAroundAll = Expect<Equals<Eval<"(1+2*3)">, 7>>;
type _parensSubgroup = Expect<Equals<Eval<"(10-2)-3">, 5>>;
type _parensRightAssocForced = Expect<Equals<Eval<"10-(2-1)">, 9>>;
type _parensProduct = Expect<Equals<Eval<"(1+2)*(3+4)">, 21>>;
type _parensTriple = Expect<Equals<Eval<"(1+2)*(3+4)*(5-3)">, 42>>;

/* -------------------------------- 6. nesting ------------------------------ */

type _nested2 = Expect<Equals<Eval<"((1+2)*(3+4))">, 21>>;
type _nested3 = Expect<Equals<Eval<"((2*(3+4))+(5*(6-4)))">, 24>>;
type _nestedRight = Expect<Equals<Eval<"(1+(2+(3+(4+(5+(6+(7+(8+(9+10)))))))))">, 55>>;
type _nestedLeft = Expect<Equals<Eval<"((((((((((1+1)+1)+1)+1)+1)+1)+1)+1)+1)+1)">, 11>>;
type _nestedMixed = Expect<Equals<Eval<"2*(3+(4*(5+(6*2))))">, 142>>;
type _nestedTen = Expect<Equals<Eval<"((((((((((1+1))))))))))">, 2>>;

/* ------------------------------ 7. whitespace ----------------------------- */

type _spacesAround = Expect<Equals<Eval<" 2 + 3 * 4 ">, 14>>;
type _spacesInParens = Expect<Equals<Eval<"( 2 + 3 ) * 4">, 20>>;
type _spacesInsideNumbers = Expect<Equals<Eval<"1 2">, never>>; // "1 2" is not a number
type _tabsAndNewlines = Expect<Equals<Eval<"\t1\n+\r2 ">, 3>>;
type _lotsOfSpaces = Expect<Equals<Eval<"   10   -   2   -   3   ">, 5>>;
type _noSpaces = Expect<Equals<Eval<"10-2-3">, 5>>;

/* ---------------------- 8. multi-digit and larger values ------------------ */

type _multiDigitSum = Expect<Equals<Eval<"12+34">, 46>>;
type _multiDigitProduct = Expect<Equals<Eval<"12*12">, 144>>;
type _threeDigitDiff = Expect<Equals<Eval<"1000-1">, 999>>;
type _squaresSum = Expect<Equals<Eval<"12*12+13*13">, 313>>;
type _bigProduct = Expect<Equals<Eval<"30*30">, 900>>;
type _longChain = Expect<Equals<Eval<"1+2+3+4+5+6+7+8+9+10">, 55>>;
type _mixedLong = Expect<Equals<Eval<"(2+3)*(4+5)*(1+1)-(10-4)">, 84>>;

/* -------------------------- 9. arithmetic identities ---------------------- */

type _zeroIsIdentity = Expect<Equals<Eval<"5+0">, 5>>;
type _zeroSub = Expect<Equals<Eval<"5-0">, 5>>;
type _selfSub = Expect<Equals<Eval<"5-5">, 0>>;
type _zeroProduct = Expect<Equals<Eval<"0*99">, 0>>;
type _oneIsIdentity = Expect<Equals<Eval<"1*37">, 37>>;
type _distributes = Expect<Equals<Eval<"3*(4+5)">, Eval<"3*4+3*5">>>;
type _commutes = Expect<Equals<Eval<"6*7">, Eval<"7*6">>>;
type _associates = Expect<Equals<Eval<"(2*3)*4">, Eval<"2*(3*4)">>>;

/* ------------------------- 10. malformed input -> never ------------------- */

type _empty = Expect<Equals<Eval<"">, never>>;
type _onlyOperator = Expect<Equals<Eval<"+">, never>>;
type _trailingOperator = Expect<Equals<Eval<"2+">, never>>;
type _leadingOperator = Expect<Equals<Eval<"*3">, never>>;
type _doubleOperator = Expect<Equals<Eval<"2++3">, never>>;
type _unclosedParen = Expect<Equals<Eval<"(1+2">, never>>;
type _unopenedParen = Expect<Equals<Eval<"1+2)">, never>>;
type _emptyParens = Expect<Equals<Eval<"()">, never>>;
type _strayCharacter = Expect<Equals<Eval<"2$3">, never>>;
type _division = Expect<Equals<Eval<"6/3">, never>>; // not in the grammar

/* ---------------------------- 11. generic usage --------------------------- */

// `Eval` is usable in a generic signature, not just on hand-written literals.
declare function evaluate<S extends string>(expression: S): Eval<S>;
type _generic1 = Expect<Equals<ReturnType<typeof evaluate<"2+3*4">>, 14>>;
type _generic2 = Expect<Equals<ReturnType<typeof evaluate<"(2+3)*4">>, 20>>;

/* --------------------------------- report --------------------------------- */

console.log(
  "All assertions in this file are type-level: if `tsgo --noEmit --strict` reports\n" +
    "no errors, every Expect<Equals<…>> resolved to true and the suite passed.",
);

export type {
  _single, _oneDigit, _twoDigits, _threeDigits, _leadingZeros, _zeroesOnly,
  _readme1, _readme2, _readme3, _readme4,
  _mulBeforeAdd, _mulBeforeAddRight, _mulBeforeSub, _mulBetweenAdds, _twoProducts,
  _productsAndDiff, _notLeftToRight,
  _subLeftAssoc, _subChain, _addSubMix, _addSubMix2, _mulLeftAssoc, _mulChain, _notRightAssoc,
  _parensOverride, _parensRight, _parensRedundant, _parensDeeplyRedundant, _parensAroundAll,
  _parensSubgroup, _parensRightAssocForced, _parensProduct, _parensTriple,
  _nested2, _nested3, _nestedRight, _nestedLeft, _nestedMixed, _nestedTen,
  _spacesAround, _spacesInParens, _spacesInsideNumbers, _tabsAndNewlines, _lotsOfSpaces, _noSpaces,
  _multiDigitSum, _multiDigitProduct, _threeDigitDiff, _squaresSum, _bigProduct, _longChain,
  _mixedLong,
  _zeroIsIdentity, _zeroSub, _selfSub, _zeroProduct, _oneIsIdentity, _distributes, _commutes,
  _associates,
  _empty, _onlyOperator, _trailingOperator, _leadingOperator, _doubleOperator, _unclosedParen,
  _unopenedParen, _emptyParens, _strayCharacter, _division,
  _generic1, _generic2,
};
