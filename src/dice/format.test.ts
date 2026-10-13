import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {parseFormula} from "./parser";
import {rollFormula} from "./roller";
import {buildRollDescription} from "./format";

function describeRoll(input: string, ...values: number[]): string {
    let index = 0;
    return buildRollDescription(rollFormula(parseFormula(input), () => values[index++]!));
}

describe("buildRollDescription", () => {
    it("shows the mat, the dice total, the modifiers and the total", () => {
        const description = describeRoll("2d6+1d4-2", 3, 5, 4);
        assert.match(description, /^```\n2d6   \[3\] \[5\]  = 8\n\+1d4  \[4\]\n```/);
        assert.match(description, /Total des dés : \*\*12\*\*/);
        assert.match(description, /Modificateurs : \*\*-2\*\*/);
        assert.match(description, /# Total : 10/);
    });

    it("pads the dice to the widest die of the roll", () => {
        assert.match(describeRoll("1d20+1d4", 7, 3), /1d20  \[ 7\]\n\+1d4  \[ 3\]/);
    });

    it("hides the modifiers line and the mini mat when they are not needed", () => {
        const description = describeRoll("3d6", 4, 1, 6);
        assert.doesNotMatch(description, /Modificateurs/);
        assert.doesNotMatch(description, /-#/);
    });

    it("applies keep / drop rules on the mat and shows every die on the mini mat", () => {
        const description = describeRoll("4d6kh3+2", 2, 6, 1, 5);
        const [main, mini] = description.split("\n\n");

        assert.match(main!, /4d6kh3  \[2\] \[6\] \[5\]  = 13/);
        assert.doesNotMatch(main!, /\[1\]/);
        assert.match(main!, /# Total : 15/);

        assert.match(mini!, /-# `4d6  \[2\] \[6\] \[1\] \[5\]`/);
        assert.match(mini!, /-# Total sans kh \/ kl \/ dh \/ dl : 16/);
    });

    it("keeps the sign of negative dice terms", () => {
        const description = describeRoll("1d20-1d6kh1", 10, 2);
        assert.match(description, /-1d6kh1  \[ 2\]/);
        assert.match(description, /Total des dés : \*\*8\*\*/);
    });

    it("reports critical rolls", () => {
        assert.match(describeRoll("1d20", 20), /Réussite critique/);
        assert.match(describeRoll("2d20kl1", 20, 1), /Échec critique/);
    });
});
