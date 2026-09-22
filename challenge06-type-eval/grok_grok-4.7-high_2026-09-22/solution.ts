/**
 * Type-level arithmetic.
 * Numbers are decimal strings so addition stays proportional to the digit count,
 * then the final string is read back as a numeric literal.
 */

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type Bit = "0" | "1";

type ToTuple = {
  "0": [];
  "1": [0];
  "2": [0, 0];
  "3": [0, 0, 0];
  "4": [0, 0, 0, 0];
  "5": [0, 0, 0, 0, 0];
  "6": [0, 0, 0, 0, 0, 0];
  "7": [0, 0, 0, 0, 0, 0, 0];
  "8": [0, 0, 0, 0, 0, 0, 0, 0];
  "9": [0, 0, 0, 0, 0, 0, 0, 0, 0];
};

type FromLen = {
  0: "0";
  1: "1";
  2: "2";
  3: "3";
  4: "4";
  5: "5";
  6: "6";
  7: "7";
  8: "8";
  9: "9";
};

type FromCarry = {
  10: "0";
  11: "1";
  12: "2";
  13: "3";
  14: "4";
  15: "5";
  16: "6";
  17: "7";
  18: "8";
  19: "9";
};

type Ten = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

type Reverse<S extends string> = S extends `${infer Head}${infer Tail}` ? `${Reverse<Tail>}${Head}` : "";

type TrimLead<S extends string> = S extends "" | "0"
  ? "0"
  : S extends `0${infer Rest}`
    ? TrimLead<Rest>
    : S;

type AddDigits<A extends Digit, B extends Digit, Carry extends Bit> =
  [...ToTuple[A], ...ToTuple[B], ...ToTuple[Carry]]["length"] extends infer Length extends
    | keyof FromLen
    | keyof FromCarry
    ? Length extends keyof FromLen
      ? [FromLen[Length], "0"]
      : Length extends keyof FromCarry
        ? [FromCarry[Length], "1"]
        : never
    : never;

type AddRev<A extends string, B extends string, Carry extends Bit = "0"> = A extends `${infer DA extends Digit}${infer RA}`
  ? B extends `${infer DB extends Digit}${infer RB}`
    ? AddDigits<DA, DB, Carry> extends [infer Sum extends string, infer Next extends Bit]
      ? `${Sum}${AddRev<RA, RB, Next>}`
      : never
    : AddDigits<DA, "0", Carry> extends [infer Sum extends string, infer Next extends Bit]
      ? `${Sum}${AddRev<RA, "", Next>}`
      : never
  : B extends `${infer DB extends Digit}${infer RB}`
    ? AddDigits<"0", DB, Carry> extends [infer Sum extends string, infer Next extends Bit]
      ? `${Sum}${AddRev<"", RB, Next>}`
      : never
    : Carry extends "1"
      ? "1"
      : "";

type AddStrings<A extends string, B extends string> = TrimLead<Reverse<AddRev<Reverse<A>, Reverse<B>>>>;

type DigitOf<N> = N extends keyof FromLen ? FromLen[N] : never;

type SubDigits<A extends Digit, B extends Digit, Borrow extends Bit> =
  [...ToTuple[A]] extends [...ToTuple[B], ...ToTuple[Borrow], ...infer Kept]
    ? [DigitOf<Kept["length"]>, "0"]
    : [...ToTuple[A], ...Ten] extends [...ToTuple[B], ...ToTuple[Borrow], ...infer Kept]
      ? [DigitOf<Kept["length"]>, "1"]
      : never;

type SubRev<A extends string, B extends string, Borrow extends Bit = "0"> = A extends `${infer DA extends Digit}${infer RA}`
  ? B extends `${infer DB extends Digit}${infer RB}`
    ? SubDigits<DA, DB, Borrow> extends [infer Diff extends string, infer Next extends Bit]
      ? `${Diff}${SubRev<RA, RB, Next>}`
      : never
    : SubDigits<DA, "0", Borrow> extends [infer Diff extends string, infer Next extends Bit]
      ? `${Diff}${SubRev<RA, "", Next>}`
      : never
  : B extends `${infer DB extends Digit}${infer RB}`
    ? SubDigits<"0", DB, Borrow> extends [infer Diff extends string, infer Next extends Bit]
      ? `${Diff}${SubRev<"", RB, Next>}`
      : never
    : "";

type SubStrings<A extends string, B extends string> = TrimLead<Reverse<SubRev<Reverse<A>, Reverse<B>>>>;

type MulByDigit<A extends string, DigitCount extends Digit, Acc extends string = "0", Seen extends unknown[] = []> =
  `${Seen["length"]}` extends DigitCount ? Acc : MulByDigit<A, DigitCount, AddStrings<Acc, A>, [...Seen, unknown]>;

type MulRev<A extends string, Digits extends string, Shift extends string = ""> = Digits extends `${infer D extends Digit}${infer Rest}`
  ? AddStrings<`${MulByDigit<A, D>}${Shift}`, MulRev<A, Rest, `${Shift}0`>>
  : "0";

type MulStrings<A extends string, B extends string> = MulRev<A, Reverse<B>>;

type Space = " " | "\t" | "\n" | "\r";
type Op = "+" | "-" | "*" | "(" | ")";

type ReadNumber<S extends string, Acc extends string = ""> = S extends `${infer D extends Digit}${infer Rest}`
  ? ReadNumber<Rest, `${Acc}${D}`>
  : [Acc, S];

type Tokenize<S extends string, Acc extends string[] = []> = S extends `${infer Char}${infer Rest}`
  ? Char extends Space
    ? Tokenize<Rest, Acc>
    : Char extends Op
      ? Tokenize<Rest, [...Acc, Char]>
      : Char extends Digit
        ? ReadNumber<S> extends [infer Num extends string, infer Next extends string]
          ? Tokenize<Next, [...Acc, Num]>
          : never
        : never
  : Acc;

type ParseExpr<Tokens extends string[]> = ParseTerm<Tokens> extends [
  infer Value extends string,
  infer Rest extends string[],
]
  ? ParseExprTail<Value, Rest>
  : never;

type ParseExprTail<Value extends string, Tokens extends string[]> = Tokens extends [
  infer Op extends string,
  ...infer Rest extends string[],
]
  ? Op extends "+" | "-"
    ? ParseTerm<Rest> extends [infer Right extends string, infer After extends string[]]
      ? ParseExprTail<Op extends "+" ? AddStrings<Value, Right> : SubStrings<Value, Right>, After>
      : never
    : [Value, Tokens]
  : [Value, Tokens];

type ParseTerm<Tokens extends string[]> = ParseFactor<Tokens> extends [
  infer Value extends string,
  infer Rest extends string[],
]
  ? ParseTermTail<Value, Rest>
  : never;

type ParseTermTail<Value extends string, Tokens extends string[]> = Tokens extends [
  "*",
  ...infer Rest extends string[],
]
  ? ParseFactor<Rest> extends [infer Right extends string, infer After extends string[]]
    ? ParseTermTail<MulStrings<Value, Right>, After>
    : never
  : [Value, Tokens];

type ParseFactor<Tokens extends string[]> = Tokens extends ["(", ...infer Rest extends string[]]
  ? ParseExpr<Rest> extends [infer Value extends string, infer After extends string[]]
    ? After extends [")", ...infer Tail extends string[]]
      ? [Value, Tail]
      : never
    : never
  : Tokens extends [infer Head extends string, ...infer Rest extends string[]]
    ? Head extends `${number}`
      ? [Head, Rest]
      : never
    : never;

type ToNumber<S extends string> = S extends `${infer N extends number}` ? N : never;

export type Eval<S extends string> =
  ParseExpr<Tokenize<S>> extends [infer Value extends string, infer Rest extends string[]]
    ? Rest["length"] extends 0
      ? ToNumber<Value>
      : never
    : never;
