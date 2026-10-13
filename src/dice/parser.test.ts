import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {DiceParseError, LIMITS, parseFormula} from "./parser";

describe("parseFormula", () => {
    it("parses a simple dice term with a modifier", () => {
        const formula = parseFormula("2d20+3");
        assert.deepEqual(formula.terms, [
            {kind: 'dice', sign: 1, count: 2, sides: 20, keep: null},
            {kind: 'constant', sign: 1, value: 3}
        ]);
        assert.equal(formula.normalized, "2d20+3");
    });

    it("defaults the dice count to 1 and reads d% as d100", () => {
        assert.equal(parseFormula("d20").normalized, "1d20");
        assert.equal(parseFormula("d%").normalized, "1d100");
    });

    it("ignores spaces and case", () => {
        assert.equal(parseFormula(" 3D6 + 1d4 - 2 ").normalized, "3d6+1d4-2");
    });

    it("parses negative terms", () => {
        const formula = parseFormula("1d20-1d4");
        assert.equal(formula.terms[1]!.sign, -1);
    });

    it("parses keep / drop rules, with a default count of 1", () => {
        assert.deepEqual(parseFormula("4d6kh3").terms[0], {kind: 'dice', sign: 1, count: 4, sides: 6, keep: {mode: 'kh', count: 3}});
        assert.deepEqual(parseFormula("2d20kl").terms[0], {kind: 'dice', sign: 1, count: 2, sides: 20, keep: {mode: 'kl', count: 1}});
        assert.equal(parseFormula("4d6dl1").normalized, "4d6dl1");
        assert.equal(parseFormula("3d8dh").normalized, "3d8dh1");
    });

    it("parses face value filters", () => {
        assert.deepEqual(parseFormula("5d6k<=3").terms[0], {kind: 'dice', sign: 1, count: 5, sides: 6, keep: {mode: 'k', operator: '<=', value: 3}});
        for (const operator of ["<", "<=", ">", ">=", "="]) {
            assert.equal(parseFormula(`4d6 k${operator} 3`).normalized, `4d6k${operator}3`);
        }
        assert.equal(parseFormula("6d6k>=5+2").normalized, "6d6k>=5+2");
    });

    const invalid: [string, string][] = [
        ["", "empty"],
        ["   ", "only spaces"],
        ["abc", "garbage"],
        ["2d", "no sides"],
        ["d", "lone d"],
        ["2d20 3d6", "missing operator"],
        ["2d20++3", "double operator"],
        ["1d20+", "trailing operator"],
        ["5", "no dice"],
        ["0d6", "zero dice"],
        ["1d1", "one side"],
        [`1d${LIMITS.maxSides + 1}`, "too many sides"],
        [`${LIMITS.dicePerTerm + 1}d6`, "too many dice in a term"],
        ["100d6+100d6+1d6", "too many dice in total"],
        ["2d20kh3", "keeping more dice than rolled"],
        ["2d20kh0", "keeping zero dice"],
        ["2d20dl2", "dropping every die"],
        ["4d6k3", "unknown keep rule"],
        ["4d6k<", "face value filter without a value"],
        ["4d6k=>3", "unknown comparison operator"],
        ["4d6k>6", "face value filter no face can match"],
        ["4d6k<1", "face value filter below every face"],
        ["4d6kh2k<3", "two filters on one term"],
        [`1d20+${LIMITS.maxConstant + 1}`, "constant too big"],
        ["1d6".padEnd(LIMITS.formulaLength + 1, "1"), "formula too long"]
    ];

    for (const [input, label] of invalid) {
        it(`rejects ${label} (${JSON.stringify(input)})`, () => {
            assert.throws(() => parseFormula(input), DiceParseError);
        });
    }

    it("rejects a formula whose canonical form is too long", () => {
        // 16 terms of "d2kh" fit in 80 characters, but "1d2kh1" each does not
        const input = Array.from({length: 16}, () => "d2kh").join("+");
        assert.ok(input.length <= LIMITS.formulaLength);
        assert.throws(() => parseFormula(input), DiceParseError);
    });

    it("rejects more terms than allowed", () => {
        const input = Array.from({length: LIMITS.maxTerms + 1}, () => "d4").join("+");
        assert.throws(() => parseFormula(input), DiceParseError);
    });
});
