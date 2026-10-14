import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {parseFormula} from "./parser";
import {cryptoRng, keptIndexes, Rng, rollFormula} from "./roller";
import {buildRerollButton, parseRerollId, REROLL_PREFIX} from "./format";

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

    it("keeps the highest dice (4d6kh3)", () => {
        const result = roll("4d6kh3", 2, 6, 1, 5);
        assert.equal(result.total, 13);
        assert.deepEqual(result.terms[0]!.dice.map(die => die.kept), [true, true, false, true]);
    });

    it("rolls with advantage / disadvantage (2d20kh1 / 2d20kl1)", () => {
        assert.equal(roll("2d20kh1+5", 7, 15).total, 20);
        assert.equal(roll("2d20kl1+5", 7, 15).total, 12);
    });

    it("drops the lowest / highest dice", () => {
        assert.equal(roll("4d6dl1", 3, 1, 4, 6).total, 13);
        assert.equal(roll("3d8dh1", 8, 2, 5).total, 7);
    });

    it("breaks ties by roll order", () => {
        assert.deepEqual([...keptIndexes([5, 5, 5], {type: 'keep', mode: 'kh', count: 2})], [0, 1]);
        assert.deepEqual([...keptIndexes([5, 5, 5], {type: 'keep', mode: 'kl', count: 1})], [0]);
    });

    it("counts the successes, with the total of their faces", () => {
        const result = roll("4d6<=3", 1, 5, 3, 2);
        assert.equal(result.total, 3);
        assert.equal(result.terms[0]!.faceTotal, 6);
        assert.deepEqual(result.terms[0]!.dice.map(die => die.kept), [true, false, true, true]);

        assert.equal(roll("6d10>=8", 9, 3, 8, 1, 10, 7).total, 3);
        assert.equal(roll("3d6=6", 6, 2, 6).total, 2);
    });

    it("adds the modifiers to the number of successes", () => {
        assert.equal(roll("6d10>=8+1", 9, 3, 8, 1, 10, 7).total, 4);
        assert.equal(roll("4d6<=3-4d6<=3", 1, 2, 6, 6, 1, 6, 6, 6).total, 1);
    });

    it("is worth 0 when no die succeeds", () => {
        const result = roll("2d6>4+1", 1, 2);
        assert.equal(result.total, 1);
        assert.equal(result.terms[0]!.faceTotal, 0);
        assert.ok(result.terms[0]!.dice.every(die => !die.kept));
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
            const customId = buildRerollButton(formula, isPrivate).toJSON() as {custom_id: string};
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
