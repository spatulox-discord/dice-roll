import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {DiceParseError, LIMITS, parseFormula} from "./parser";

describe("parseFormula", () => {
    it("parses a simple dice term with a modifier", () => {
        const formula = parseFormula("2d20+3");
        assert.deepEqual(formula.terms, [
            {kind: 'dice', sign: 1, count: 2, sides: 20, filter: null},
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

    it("parses kh / kl / dh / dl as a number of dice, 1 by default", () => {
        assert.deepEqual(parseFormula("4d6kh3").terms[0], {kind: 'dice', sign: 1, count: 4, sides: 6, filter: {type: 'keep', mode: 'kh', count: 3}});
        assert.deepEqual(parseFormula("2d20kl").terms[0], {kind: 'dice', sign: 1, count: 2, sides: 20, filter: {type: 'keep', mode: 'kl', count: 1}});
        assert.equal(parseFormula("2d20kh").normalized, "2d20kh1");
        assert.equal(parseFormula("4d6dl1").normalized, "4d6dl1");
        assert.equal(parseFormula("3d8dh").normalized, "3d8dh1");
    });

    it("parses a comparison as a success count", () => {
        assert.deepEqual(parseFormula("4d6<=3").terms[0], {kind: 'dice', sign: 1, count: 4, sides: 6, filter: {type: 'success', operator: '<=', value: 3}});
        for (const operator of ["<", "<=", ">", ">=", "="]) {
            assert.equal(parseFormula(`4d6 ${operator} 3`).normalized, `4d6${operator}3`);
        }
        assert.equal(parseFormula("6d10>=8+1").normalized, "6d10>=8+1");
    });

    it("parses a vs target on the total, >= by default", () => {
        const formula = parseFormula("2d6+3 vs 8");
        assert.deepEqual(formula.target, {operator: '>=', value: 8});
        assert.equal(formula.normalized, "2d6+3 vs 8");
        assert.equal(parseFormula("2d6+3VS8").normalized, "2d6+3 vs 8");
        assert.equal(parseFormula("2d6 vs >=8").normalized, "2d6 vs 8");
    });

    it("parses every comparison and negative targets", () => {
        for (const operator of ["<", "<=", ">", "="]) {
            assert.equal(parseFormula(`1d100 vs ${operator} 45`).normalized, `1d100 vs ${operator}45`);
        }
        assert.deepEqual(parseFormula("1d4-5 vs -2").target, {operator: '>=', value: -2});
    });

    it("combines a success count with a target", () => {
        const formula = parseFormula("6d10>=8 vs 3");
        assert.deepEqual(formula.terms[0], {kind: 'dice', sign: 1, count: 6, sides: 10, filter: {type: 'success', operator: '>=', value: 8}});
        assert.deepEqual(formula.target, {operator: '>=', value: 3});
    });

    it("has no target without vs", () => {
        assert.equal(parseFormula("2d6").target, null);
    });

    const invalid: [string, string][] = [
        ["", "empty"],
        ["   ", "only spaces"],
        ["abc", "garbage"],
        ["2d", "no sides"],
        ["d", "lone d"],
        ["2d20 3d6", "missing operator"],
        ["1d20 5", "a modifier without operator"],
        ["1 0d6", "a space inside the dice count"],
        ["1d20 vs 1 5", "a space inside the target"],
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
        ["4d6k<=3", "the removed k<op> notation"],
        ["4d6<", "comparison without a value"],
        ["4d6=>3", "unknown comparison operator"],
        ["4d6>6", "comparison no face can match"],
        ["4d6<1", "comparison below every face"],
        ["4d6kh2<3", "two filters on one term"],
        ["vs 8", "a target without dice"],
        ["2d6 vs", "vs without a value"],
        ["2d6 vs abc", "vs with garbage"],
        ["2d6 vs 8 vs 9", "two targets"],
        ["2d6 vs 8+1", "a term after the target"],
        ["2d6 vs => 8", "unknown target comparison"],
        ["2d6 vs 2000000", "target too big"],
        [`1d20+${LIMITS.maxConstant + 1}`, "constant too big"],
        ["1d6".padEnd(LIMITS.formulaLength + 1, "1"), "formula too long"]
    ];

    for (const [input, label] of invalid) {
        it(`rejects ${label} (${JSON.stringify(input)})`, () => {
            assert.throws(() => parseFormula(input), DiceParseError);
        });
    }

    it("explains why a drop rule is rejected", () => {
        assert.throws(() => parseFormula("4d6dh0"), /drop at least 1 die/);
        assert.throws(() => parseFormula("4d6dl4"), /cannot drop every die/);
    });

    it("rejects a formula whose canonical form is too long", () => {
        // 13 terms of "d2kh1" fit in 80 characters, but "1d2kh1" each does not
        const input = Array.from({length: 13}, () => "d2kh1").join("+");
        assert.ok(input.length <= LIMITS.formulaLength);
        assert.throws(() => parseFormula(input), DiceParseError);
    });

    it("rejects more terms than allowed", () => {
        const input = Array.from({length: LIMITS.maxTerms + 1}, () => "d4").join("+");
        assert.throws(() => parseFormula(input), DiceParseError);
    });
});
