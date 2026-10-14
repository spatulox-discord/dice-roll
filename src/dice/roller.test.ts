import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {parseFormula} from "./parser";
import {cryptoRng, keptIndexes, Rng, rollFormula} from "./roller";
import {buildRerollRow, parseRerollId, REROLL_PREFIX} from "./format";

/** Returns the given values in order, whatever the dice */
function sequence(...values: number[]): Rng {
    let index = 0;
    return () => {
        const value = values[index++];
        if (value === undefined) throw new Error("sequence exhausted");
        return value;
    };
}

function roll(input: string, ...values: number[]) {
    return rollFormula(parseFormula(input), sequence(...values));
}

describe("rollFormula", () => {
    it("sums dice and modifiers", () => {
        const result = roll("2d6+3", 4, 5);
        assert.equal(result.total, 12);
        assert.deepEqual(result.terms[0]!.dice, [{value: 4, kept: true}, {value: 5, kept: true}]);
    });

    it("subtracts negative terms", () => {
        assert.equal(roll("1d20-1d4-2", 10, 3).total, 5);
    });

    it("kl keeps every die showing the value or less (6d6kl3)", () => {
        const result = roll("6d6kl3", 1, 5, 3, 3, 6, 2);
        assert.deepEqual(result.terms[0]!.dice.filter(die => die.kept).map(die => die.value), [1, 3, 3, 2]);
        assert.equal(result.total, 9);
    });

    it("kh keeps every die showing the value or more (4d6kh3)", () => {
        const result = roll("4d6kh3", 2, 6, 1, 3);
        assert.deepEqual(result.terms[0]!.dice.map(die => die.kept), [false, true, false, true]);
        assert.equal(result.total, 9);
    });

    it("dl / dh remove every die showing the value or less / more", () => {
        assert.equal(roll("4d6dl2", 3, 1, 2, 6).total, 9);
        assert.equal(roll("3d8dh5", 8, 2, 5).total, 2);
    });

    it("keeps the dice matching a face value filter", () => {
        const result = roll("5d6k<=3", 6, 4, 5, 1, 3);
        assert.equal(result.total, 4);
        assert.deepEqual(result.terms[0]!.dice.map(die => die.kept), [false, false, false, true, true]);
        assert.equal(roll("6d6k>=5", 5, 2, 6, 6, 1, 4).total, 17);
        assert.equal(roll("4d6k<3", 1, 2, 3, 2).total, 5);
        assert.equal(roll("4d6k>3", 1, 2, 3, 4).total, 4);
        assert.equal(roll("3d6k=6", 6, 2, 6).total, 12);
    });

    it("totals 0 when a face value filter matches no die", () => {
        const result = roll("2d6k>4+1", 1, 2);
        assert.equal(result.total, 1);
        assert.ok(result.terms[0]!.dice.every(die => !die.kept));
    });

    it("keeps every die of equal value", () => {
        assert.deepEqual([...keptIndexes([5, 5, 2], {mode: 'kh', operator: '>=', value: 5})], [0, 1]);
    });

    it("detects natural 20 and natural 1 on a single d20", () => {
        assert.equal(roll("1d20+5", 20).critical, 'success');
        assert.equal(roll("1d20", 1).critical, 'failure');
        assert.equal(roll("1d20", 12).critical, null);
        assert.equal(roll("2d20kh15", 20, 3).critical, 'success');
        assert.equal(roll("2d20kl5", 20, 1).critical, 'failure');
    });

    it("does not report criticals when the roll is not a single kept d20", () => {
        assert.equal(roll("2d20", 20, 20).critical, null);
        assert.equal(roll("1d20+1d4", 20, 4).critical, null);
        assert.equal(roll("1d6", 1).critical, null);
    });

    it("stays within bounds with the crypto rng", () => {
        for (let i = 0; i < 1000; i++) {
            const value = cryptoRng(6);
            assert.ok(value >= 1 && value <= 6, `${value} out of bounds`);
        }
    });
});

describe("reroll customId", () => {
    it("round-trips the formula and the visibility", () => {
        for (const isPrivate of [true, false]) {
            const formula = parseFormula("2d20kl1+1d4-2").normalized;
            const customId = buildRerollRow(formula, isPrivate).components[0]!.toJSON() as {custom_id: string};
            assert.ok(customId.custom_id.startsWith(REROLL_PREFIX));
            assert.ok(customId.custom_id.length <= 100);
            assert.deepEqual(parseRerollId(customId.custom_id), {formula, isPrivate});
        }
    });

    it("rejects foreign or malformed ids", () => {
        assert.equal(parseRerollId("other|p|1d20"), null);
        assert.equal(parseRerollId(`${REROLL_PREFIX}|x|1d20`), null);
        assert.equal(parseRerollId(REROLL_PREFIX), null);
    });
});
