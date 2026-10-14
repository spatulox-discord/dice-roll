import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {parseFormula} from "./parser";
import {rollFormula} from "./roller";
import {buildFilterField, buildRollDescription} from "./format";

function rollWith(input: string, values: number[]) {
    let index = 0;
    return rollFormula(parseFormula(input), () => values[index++]!);
}

function describeRoll(input: string, ...values: number[]): string {
    return buildRollDescription(rollWith(input, values));
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

    it("applies the filters on the mat and shows every die on the mini mat", () => {
        const description = describeRoll("4d6kh3+2", 2, 6, 1, 5);
        const [main, mini] = description.split("\n\n");

        assert.match(main!, /4d6kh3  \[6\] \[5\]  = 11/);
        assert.doesNotMatch(main!, /\[1\]|\[2\]/);
        assert.match(main!, /# Total : 13/);

        assert.match(mini!, /-# `4d6  \[2\] \[6\] \[1\] \[5\]`/);
        assert.match(mini!, /-# Total sans filtre : 16/);
    });

    it("applies face value filters on the mat, even when no die matches", () => {
        const description = describeRoll("5d6k<=3+1", 6, 4, 5, 1, 3);
        assert.match(description, /5d6k<=3  \[1\] \[3\]  = 4/);
        assert.match(description, /# Total : 5/);
        assert.match(description, /-# `5d6  \[6\] \[4\] \[5\] \[1\] \[3\]`/);

        assert.match(describeRoll("2d6k>4", 1, 2), /2d6k>4  aucun dé\n/);
    });

    it("keeps the sign of negative dice terms", () => {
        const description = describeRoll("1d20-1d6kh1", 10, 2);
        assert.match(description, /-1d6kh1  \[ 2\]/);
        assert.match(description, /Total des dés : \*\*8\*\*/);
    });
});

describe("buildFilterField", () => {
    it("is absent without keep / drop rules", () => {
        assert.equal(buildFilterField(rollWith("3d6+2", [1, 2, 3])), null);
    });

    it("lists the dice kept by kh / kl", () => {
        assert.equal(buildFilterField(rollWith("6d6kl3", [1, 5, 3, 3, 6, 2])), "`6d6kl3` garde les dés ≤ 3 → `[1] [3] [3] [2]`");
        assert.equal(buildFilterField(rollWith("4d6kh3", [2, 6, 1, 5])), "`4d6kh3` garde les dés ≥ 3 → `[6] [5]`");
    });

    it("lists the dice removed by dh / dl", () => {
        assert.equal(buildFilterField(rollWith("4d6dl2", [3, 1, 2, 6])), "`4d6dl2` retire les dés ≤ 2 → `[1] [2]`");
        assert.equal(buildFilterField(rollWith("5d8dh7", [8, 2, 5, 7, 1])), "`5d8dh7` retire les dés ≥ 7 → `[8] [7]`");
    });

    it("describes face value filters", () => {
        assert.equal(buildFilterField(rollWith("5d6k<=3", [6, 4, 5, 1, 3])), "`5d6k<=3` garde les dés ≤ 3 → `[1] [3]`");
        assert.equal(buildFilterField(rollWith("6d6k>=5", [5, 2, 6, 6, 1, 4])), "`6d6k>=5` garde les dés ≥ 5 → `[5] [6] [6]`");
        assert.equal(buildFilterField(rollWith("3d6k=6", [1, 2, 3])), "`3d6k=6` garde les dés = 6 → aucun dé");
    });

    it("has one line per filtered term", () => {
        const field = buildFilterField(rollWith("2d20kh10+1d4+4d6dl1", [3, 18, 2, 5, 1, 4, 6]));
        assert.deepEqual(field?.split("\n"), [
            "`2d20kh10` garde les dés ≥ 10 → `[18]`",
            "`4d6dl1` retire les dés ≤ 1 → `[1]`"
        ]);
    });
});
