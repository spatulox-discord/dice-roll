import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {ComponentType} from "discord.js";
import {parseFormula} from "./parser";
import {RollResult, rollFormula} from "./roller";
import {
    buildFacesTotalsText,
    buildFiltersText,
    buildRollContainer,
    buildRollTable,
    buildTargetText,
    FILTER_FIELD_NAME,
    TEXT_MAX_LENGTH
} from "./format";
import {containerTexts, fakeUser} from "../test/components";

function rollWith(input: string, values: number[]) {
    let index = 0;
    return rollFormula(parseFormula(input), () => values[index++]!);
}

function table(input: string, ...values: number[]): string {
    return buildRollTable(rollWith(input, values));
}

describe("buildRollTable", () => {
    it("draws a single dice term with its sum", () => {
        assert.equal(table("5d6", 1, 2, 4, 2, 4), [
            "╔══════════════════╗",
            "║       5d6        ║",
            "╠═══════════╤══════╣",
            "║   rolls   │ sum  ║",
            "╟───────────┼──────╢",
            "║ 1 2 4 2 4 │ [13] ║",
            "╚═══════════╧══════╝"
        ].join("\n"));
    });

    it("adds a dice column, a mod row and a total row with several terms", () => {
        assert.equal(table("2d20kh1+1d4+3", 15, 7, 3), [
            "╔══════════════════════╗",
            "║    2d20kh1+1d4+3     ║",
            "╠══════╤════════╤══════╣",
            "║ dice │ rolls  │ sum  ║",
            "╟──────┼────────┼──────╢",
            "║ 2d20 │ 15 (7) │ [15] ║",
            "║ +1d4 │ 3      │ [3]  ║",
            "║ mod  │        │  +3  ║",
            "╟──────┴────────┼──────╢",
            "║ total         │ [21] ║",
            "╚═══════════════╧══════╝"
        ].join("\n"));
    });

    it("adds a total row to a single term with a modifier", () => {
        const lines = table("4d6kh3+2", 2, 6, 1, 5).split("\n");
        assert.equal(lines[5], "║ 2 6 (1) 5 │ [13] ║");
        assert.equal(lines[6], "║ mod       │  +2  ║");
        assert.equal(lines[8], "║ total     │ [15] ║");
    });

    it("shows the successes with the total of their faces", () => {
        const lines = table("4d6<=3", 1, 5, 3, 2).split("\n");
        assert.equal(lines[3], "║   rolls   │ successes ║");
        assert.equal(lines[5], "║ 1 (5) 3 2 │    [3]    ║");
    });

    it("titles the sum column result when sums and successes are mixed", () => {
        assert.match(table("1d20+4d6<=3", 12, 1, 5, 3, 2), /│ +result +║/);
    });

    it("keeps the sign of negative terms", () => {
        const output = table("1d20-1d6", 12, 4);
        assert.match(output, /║ -1d6 │ 4 +│ +\[-4\] +║/);
        assert.match(output, /║ total +│ +\[8\] +║/);
    });

    it("wraps long rolls over several lines", () => {
        const lines = table("12d6", 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6).split("\n");
        assert.equal(lines[5], "║ 1 2 3 4 5 6 1 2 3 4 │ [42] ║");
        assert.equal(lines[6], "║ 5 6                 │      ║");
    });

    it("widens the table for a long formula", () => {
        const lines = table("1d4+1d4+1d4", 1, 2, 3).split("\n");
        assert.ok(lines.every(line => line.length === lines[0]!.length), "all lines have the same width");
        assert.match(lines[1]!, /1d4\+1d4\+1d4/);
    });

    it("can hide the rolls", () => {
        assert.match(buildRollTable(rollWith("5d6", [1, 2, 4, 2, 4]), true), /║ … +│ \[13\] ║/);
    });
});

describe("buildFacesTotalsText", () => {
    it("is absent without success count", () => {
        assert.equal(buildFacesTotalsText(rollWith("4d6kh3+2", [2, 6, 1, 5])), null);
    });

    it("gives the total of every face and of the faces of the successes", () => {
        assert.equal(buildFacesTotalsText(rollWith("4d6<=3", [1, 5, 3, 2])),
            "## Total:\n- faces: **11**\n- successes faces: **6**");
        assert.equal(buildFacesTotalsText(rollWith("2d6>4", [1, 2])),
            "## Total:\n- faces: **3**\n- successes faces: **0**");
    });

    it("names each success count when there are several", () => {
        assert.deepEqual(buildFacesTotalsText(rollWith("4d6<=3+1d20+2d10>=8", [1, 5, 3, 2, 12, 9, 3]))?.split("\n"), [
            "## Total `4d6<=3`:",
            "- faces: **11**",
            "- successes faces: **6**",
            "## Total `2d10>=8`:",
            "- faces: **12**",
            "- successes faces: **9**"
        ]);
    });
});

describe("buildTargetText", () => {
    it("is absent without vs", () => {
        assert.equal(buildTargetText(rollWith("2d6", [1, 2])), null);
    });

    it("shows the success with the comparison", () => {
        assert.equal(buildTargetText(rollWith("2d6+3 vs 8", [4, 4])), "### ✅ Success: 11 ≥ 8");
        assert.equal(buildTargetText(rollWith("1d100 vs <=45", [37])), "### ✅ Success: 37 ≤ 45");
    });

    it("shows the failure with the opposite comparison", () => {
        assert.equal(buildTargetText(rollWith("2d6+3 vs 8", [1, 2])), "### ❌ Failure: 6 < 8");
        assert.equal(buildTargetText(rollWith("1d100 vs <=45", [46])), "### ❌ Failure: 46 > 45");
        assert.equal(buildTargetText(rollWith("1d6 vs =6", [2])), "### ❌ Failure: 2 ≠ 6");
    });
});

describe("buildFiltersText", () => {
    it("is absent without filter", () => {
        assert.equal(buildFiltersText(rollWith("3d6+2", [1, 2, 3])), null);
    });

    it("describes each filter, then the legend", () => {
        assert.equal(buildFiltersText(rollWith("2d20kh1+4d6dl1+4d6kl3", [15, 7, 3, 1, 4, 6, 2, 6, 1, 5])), [
            "`2d20kh1` keeps the highest die",
            "`4d6dl1` drops the lowest die",
            "`4d6kl3` keeps the 3 lowest dice",
            "-# (n) = not counted"
        ].join("\n"));
    });

    it("gives the successes and the total of their faces", () => {
        assert.equal(buildFiltersText(rollWith("4d6<=3", [1, 5, 3, 2])),
            "`4d6<=3` counts dice ≤ 3 as successes: 3 successes\n-# (n) = not counted");
        assert.match(buildFiltersText(rollWith("2d6=6", [6, 1]))!, /: 1 success$/m);
    });
});

describe("buildRollContainer", () => {
    function build(result: RollResult, isPrivate = false) {
        const container = buildRollContainer(result, fakeUser, isPrivate);
        return {json: JSON.stringify(container.toJSON()), texts: containerTexts(container), container};
    }

    it("shows who rolled, the table, the filters and the reroll button, in this order", () => {
        const {texts, container} = build(rollWith("2d20kh1", [15, 7]));

        assert.match(texts[0]!, /^-# 🎲 Rolled by \*\*Testeur\\_\\\*du\\\*\\_dé\*\*$/);
        assert.ok(texts[1]!.startsWith("```\n╔"));
        assert.equal(texts[2], `__**${FILTER_FIELD_NAME}**__`);
        assert.ok(texts[3]!.startsWith("`2d20kh1` keeps the highest die"));

        const components = container.toJSON().components;
        const row = components[components.length - 1]!;
        assert.equal(row.type, ComponentType.ActionRow);
        const button = row.type === ComponentType.ActionRow ? row.components[0] : undefined;
        assert.equal(button && "custom_id" in button ? button.custom_id : null, "dice_reroll|s|2d20kh1");
    });

    it("puts the faces totals right under the table, outside the code block", () => {
        const {texts} = build(rollWith("4d6<=3 vs 2", [1, 5, 3, 2]));
        assert.ok(texts[1]!.startsWith("```\n╔"));
        assert.doesNotMatch(texts[1]!, /faces total/);
        assert.equal(texts[2], "## Total:\n- faces: **11**\n- successes faces: **6**");
        assert.equal(texts[3], "### ✅ Success: 3 ≥ 2");
    });

    it("puts the success / failure right under the table", () => {
        const {texts} = build(rollWith("2d6+3 vs 8", [4, 4]));
        assert.ok(texts[1]!.startsWith("```\n╔"));
        assert.match(texts[1]!, /2d6\+3 vs 8/);
        assert.equal(texts[2], "### ✅ Success: 11 ≥ 8");
    });

    it("has no filters section without filter", () => {
        assert.doesNotMatch(build(rollWith("3d6", [1, 2, 3])).json, /Filters|not counted/);
    });

    it("carries the visibility in the reroll button", () => {
        assert.match(build(rollWith("1d20", [3]), true).json, /dice_reroll\|p\|1d20/);
    });

    it("shows every die of the biggest roll the limits allow, within Discord's text limit", () => {
        // 200 dice showing 1000, almost all between parentheses, negative sums : the widest table possible
        const result = rollWith("-100d1000kh1-100d1000kh1", Array.from({length: 200}, () => 1000));
        const {texts} = build(result);
        const total = texts.reduce((sum, text) => sum + text.length, 0);

        assert.ok(total <= TEXT_MAX_LENGTH, `${total} characters`);
        assert.doesNotMatch(texts.join("\n"), /│ … /, "no die is hidden");
    });
});
